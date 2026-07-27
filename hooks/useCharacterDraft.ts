"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { deleteDoc, deleteField, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useCharacters } from "@/hooks/useCharacters";
import { resolveCharacterBgmUrl } from "@/lib/bgm-catalog";
import { compactCaseFileDetailTheme } from "@/lib/case-file-theme";
import {
  characterToDraft,
  createBlankDraft,
  draftBasicsHaveContent,
  draftBasicsLookEmpty,
  draftToCharacter,
  getLegacyRelationshipsMigrationNotice,
  getLegacySettingsMigrationNotice,
  mergeDraftForKindMigration,
  type CharacterDraft,
} from "@/lib/character-draft";
import {
  CHARACTER_KIND_ADMIN_LABELS,
  filterCharactersByKind,
  filterPairLinkableCharacters,
  normalizeCharacterKind,
} from "@/lib/character-kind";
import { omitUndefined } from "@/lib/firestore-helpers";
import { getFirebaseDb } from "@/lib/firebase";
import { pruneDraftTextGlitch, pruneSubPageTextGlitch } from "@/lib/glitch-fields";
import {
  canRecoverFromLegacyPairMembers,
  recoverCharacterFromLegacyPairMember,
} from "@/lib/legacy-pair-member-recovery";
import { formatPairDisplayName } from "@/lib/pair-members";
import { deleteR2Images } from "@/lib/r2-upload-client";
import {
  buildTextGlitchFirestorePatch,
  countRemovedGlitchPaths,
} from "@/lib/text-glitch-persistence";
import type { Character, CharacterKind } from "@/lib/types";
import { normalizeWorks, normalizeWorldEntries } from "@/utils/normalizers";

type UseCharacterDraftOptions = {
  isAdmin: boolean;
  onNotice: (message: string) => void;
  setIsSaving: (value: boolean) => void;
  clearPendingUploads: () => void;
  /**
   * 캐릭터 선택/새 작성 시 참가 세계관 폼·편집 섹션을 페이지 쪽에서 초기화합니다.
   */
  onCharacterNavigation: () => void;
};

/**
 * 관리자 캐릭터 편집 상태입니다.
 * 목록 읽기는 useCharacters 싱글톤을 재사용하고, 편집 draft는 로컬로만 둡니다.
 * 스냅샷 갱신으로 입력 중이던 draft를 덮어쓰지 않습니다.
 */
export const useCharacterDraft = ({
  isAdmin,
  onNotice,
  setIsSaving,
  clearPendingUploads,
  onCharacterNavigation,
}: UseCharacterDraftOptions) => {
  const { data: characters, error: charactersError } = useCharacters();
  const [activeCharacterId, setActiveCharacterId] = useState("");
  const [activeCharacterKind, setActiveCharacterKind] = useState<CharacterKind>("oc");
  const [activeSubPageId, setActiveSubPageId] = useState("");
  const [draft, setDraft] = useState<CharacterDraft>(() => createBlankDraft());
  const [workDraft, setWorkDraft] = useState({
    title: "",
    kind: "새 연성",
    date: "",
    body: "",
  });
  const charactersRef = useRef(characters);
  charactersRef.current = characters;

  useEffect(() => {
    if (charactersError) {
      onNotice(charactersError);
    }
  }, [charactersError, onNotice]);

  const activeCharacter = useMemo(
    () =>
      activeCharacterId
        ? characters.find((character) => character.id === activeCharacterId)
        : undefined,
    [activeCharacterId, characters],
  );

  const filteredCharacters = useMemo(
    () => filterCharactersByKind(characters, activeCharacterKind),
    [activeCharacterKind, characters],
  );

  const pairLinkableCharacters = useMemo(
    () => filterPairLinkableCharacters(characters),
    [characters],
  );

  const canRecoverLegacyPairMember = useMemo(
    () => (activeCharacter ? canRecoverFromLegacyPairMembers(activeCharacter) : false),
    [activeCharacter],
  );

  const kindLabel = CHARACTER_KIND_ADMIN_LABELS[normalizeCharacterKind(draft.kind)];
  const isPairDraft = normalizeCharacterKind(draft.kind) === "pair";

  const loadCharacterDraft = (character: Character) => {
    const nextDraft = characterToDraft(character);
    setDraft(nextDraft);
    setActiveSubPageId(nextDraft.subPages[0]?.id ?? "");
    setActiveCharacterKind(normalizeCharacterKind(character.kind));
    const settingsMigrationNotice = getLegacySettingsMigrationNotice(character);
    const relationshipsMigrationNotice = getLegacyRelationshipsMigrationNotice(character);
    if (settingsMigrationNotice) {
      onNotice(settingsMigrationNotice);
    } else if (relationshipsMigrationNotice) {
      onNotice(relationshipsMigrationNotice);
    }
  };

  const selectCharacterFromList = (character: Character) => {
    setActiveCharacterId(character.id);
    setActiveCharacterKind(normalizeCharacterKind(character.kind));
    loadCharacterDraft(character);
    onCharacterNavigation();
  };

  const startNewCharacter = (kind: CharacterKind = activeCharacterKind) => {
    setActiveCharacterId("");
    setActiveSubPageId("");
    setDraft(createBlankDraft(kind));
    setWorkDraft({ title: "", kind: "새 연성", date: "", body: "" });
    clearPendingUploads();
    onCharacterNavigation();
    onNotice(`새 ${CHARACTER_KIND_ADMIN_LABELS[kind]} 정보를 입력해주세요.`);
  };

  const handleActiveKindChange = (kind: CharacterKind) => {
    setActiveCharacterKind(kind);

    if (activeCharacterId) {
      const editingCurrent = characters.find((character) => character.id === activeCharacterId);
      if (editingCurrent && draft.id === editingCurrent.id) {
        return;
      }
    }

    const current = activeCharacterId
      ? characters.find((character) => character.id === activeCharacterId)
      : undefined;

    if (current && normalizeCharacterKind(current.kind) === kind) {
      return;
    }

    const firstInKind = filterCharactersByKind(characters, kind)[0];
    if (firstInKind) {
      selectCharacterFromList(firstInKind);
      return;
    }

    startNewCharacter(kind);
  };

  const reloadCharacterFromServer = () => {
    if (!activeCharacter) {
      onNotice("목록에서 항목을 먼저 선택해주세요.");
      return;
    }

    loadCharacterDraft(activeCharacter);
    onNotice(
      "서버에 저장된 내용을 다시 불러왔어요. 카드·레코드가 비어 보이면 이 버튼을 눌러보세요.",
    );
  };

  const saveCharacter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onNotice("");

    if (!isAdmin) {
      onNotice("관리자만 저장할 수 있어요.");
      return;
    }

    const existingCharacter = characters.find((character) => character.id === draft.id);
    const migratedDraft = existingCharacter
      ? mergeDraftForKindMigration(draft, existingCharacter)
      : draft;
    const prunedDraft: CharacterDraft = {
      ...migratedDraft,
      textGlitch: pruneDraftTextGlitch(migratedDraft.textGlitch, migratedDraft),
      subPages: migratedDraft.subPages.map((subPage) => ({
        ...subPage,
        textGlitch: pruneSubPageTextGlitch(subPage.textGlitch, subPage),
      })),
    };
    const preservedBasicsFromExisting =
      existingCharacter &&
      migratedDraft !== draft &&
      draftBasicsLookEmpty(draft) &&
      draftBasicsHaveContent(characterToDraft(existingCharacter));
    const character = draftToCharacter(
      prunedDraft,
      existingCharacter?.works,
      existingCharacter?.images,
      normalizeWorldEntries(existingCharacter?.worldEntries),
      existingCharacter,
      characters,
    );

    const isPair = normalizeCharacterKind(character.kind) === "pair";
    const resolvedName = isPair
      ? character.name.trim() || formatPairDisplayName(character)
      : character.name;

    if (!character.id || (!isPair && !resolvedName) || (isPair && !resolvedName)) {
      onNotice(
        isPair
          ? "페어 이름 또는 멤버 이름 중 하나는 꼭 입력해주세요."
          : `${kindLabel} 이름은 꼭 입력해주세요.`,
      );
      return;
    }

    if (isPair && !character.name.trim()) {
      character.name = resolvedName;
    }

    const storedGlitch = existingCharacter?.textGlitch;
    const textGlitchPatch = buildTextGlitchFirestorePatch(character.textGlitch, storedGlitch);
    const removedGlitchPathCount = countRemovedGlitchPaths(character.textGlitch, storedGlitch);
    const hadGlitchDraft = Object.keys(prunedDraft.textGlitch).length > 0;
    const hadStoredGlitch = Boolean(storedGlitch && Object.keys(storedGlitch).length > 0);
    const resolvedBgmUrl = resolveCharacterBgmUrl(prunedDraft.bgmUrl);
    const compactedDetailTheme = compactCaseFileDetailTheme(character.detailTheme);
    const { textGlitch: _textGlitch, confidential, ...characterBody } = character;

    try {
      setIsSaving(true);
      await setDoc(
        doc(getFirebaseDb(), "characters", character.id),
        omitUndefined({
          ...characterBody,
          ...textGlitchPatch,
          ...(resolvedBgmUrl ? { bgmUrl: resolvedBgmUrl } : { bgmUrl: deleteField() }),
          ...(confidential ? { confidential: true } : { confidential: deleteField() }),
          ...(compactedDetailTheme
            ? { detailTheme: compactedDetailTheme }
            : { detailTheme: deleteField() }),
          ...(normalizeCharacterKind(character.kind) !== "pair"
            ? { pairMemberIds: deleteField() }
            : {}),
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      );
      setActiveCharacterId(character.id);
      setActiveCharacterKind(normalizeCharacterKind(character.kind));
      setDraft({
        ...characterToDraft(character),
        textGlitch: character.textGlitch ?? prunedDraft.textGlitch,
      });
      if (hadGlitchDraft && !character.textGlitch) {
        onNotice(
          "자캐는 저장됐지만, 오류 구간이 텍스트와 맞지 않아 오류 설정은 빠졌어요. 구간을 다시 지정해주세요.",
        );
      } else if (!character.textGlitch && hadStoredGlitch) {
        onNotice("본 페이지에 반영되도록 저장했어요. 오류 구간은 모두 제거됐습니다.");
      } else if (character.textGlitch && removedGlitchPathCount > 0) {
        onNotice("본 페이지에 반영되도록 저장했어요. 제거한 오류 구간도 반영됐습니다.");
      } else if (preservedBasicsFromExisting) {
        onNotice(
          `분류만 바꿨는데 카드·레코드 칸이 비어 있어서, 기존 내용을 유지한 채 「${CHARACTER_KIND_ADMIN_LABELS[normalizeCharacterKind(character.kind)]}」로 저장했어요.`,
        );
      } else {
        onNotice(
          character.textGlitch
            ? "본 페이지에 반영되도록 저장했어요. 오류 구간도 함께 저장됐습니다."
            : `본 페이지에 반영되도록 저장했어요. 왼쪽 「${CHARACTER_KIND_ADMIN_LABELS[normalizeCharacterKind(character.kind)]}」 목록에서 확인할 수 있어요.`,
        );
      }
    } catch (error) {
      onNotice(error instanceof Error ? error.message : `${kindLabel} 저장에 실패했어요.`);
    } finally {
      setIsSaving(false);
    }
  };

  const recoverLegacyPairMemberData = async () => {
    if (!isAdmin) {
      onNotice("관리자만 복구할 수 있어요.");
      return;
    }

    if (!activeCharacter) {
      onNotice("목록에서 항목을 먼저 선택해주세요.");
      return;
    }

    const recovered = recoverCharacterFromLegacyPairMember(activeCharacter);
    if (!recovered) {
      onNotice("복구할 예전 페어 멤버 데이터가 없어요.");
      return;
    }

    const recoveredDraft = characterToDraft(recovered);
    const prunedDraft: CharacterDraft = {
      ...recoveredDraft,
      textGlitch: pruneDraftTextGlitch(recoveredDraft.textGlitch, recoveredDraft),
      subPages: recoveredDraft.subPages.map((subPage) => ({
        ...subPage,
        textGlitch: pruneSubPageTextGlitch(subPage.textGlitch, subPage),
      })),
    };
    const character = draftToCharacter(
      prunedDraft,
      recovered.works,
      recovered.images,
      normalizeWorldEntries(recovered.worldEntries),
      activeCharacter,
      characters,
    );
    const storedGlitch = activeCharacter.textGlitch;
    const textGlitchPatch = buildTextGlitchFirestorePatch(character.textGlitch, storedGlitch);
    const resolvedBgmUrl = resolveCharacterBgmUrl(prunedDraft.bgmUrl);
    const compactedDetailTheme = compactCaseFileDetailTheme(character.detailTheme);
    const { textGlitch: _textGlitch, confidential, ...characterBody } = character;

    try {
      setIsSaving(true);
      await setDoc(
        doc(getFirebaseDb(), "characters", character.id),
        omitUndefined({
          ...characterBody,
          ...textGlitchPatch,
          ...(resolvedBgmUrl ? { bgmUrl: resolvedBgmUrl } : { bgmUrl: deleteField() }),
          ...(confidential ? { confidential: true } : { confidential: deleteField() }),
          ...(compactedDetailTheme
            ? { detailTheme: compactedDetailTheme }
            : { detailTheme: deleteField() }),
          ...(normalizeCharacterKind(character.kind) !== "pair"
            ? { pairMemberIds: deleteField() }
            : {}),
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      );
      setActiveCharacterId(character.id);
      setActiveCharacterKind(normalizeCharacterKind(character.kind));
      setDraft({
        ...characterToDraft(character),
        textGlitch: character.textGlitch ?? prunedDraft.textGlitch,
      });
      onNotice(
        "예전 페어 멤버 칸에 남아 있던 카드·레코드(대사, 프로필, 레코드 박스, 오류)를 복구해 저장했어요.",
      );
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "페어 멤버 데이터 복구에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCharacter = async (character: Character) => {
    if (!isAdmin) {
      onNotice("관리자만 삭제할 수 있어요.");
      return;
    }

    try {
      setIsSaving(true);
      const worldImages = normalizeWorldEntries(character.worldEntries).flatMap(
        (entry) => entry.images,
      );
      const workImages = normalizeWorks(character.works).flatMap((work) => work.images ?? []);
      const worldWorkImages = normalizeWorldEntries(character.worldEntries).flatMap((entry) =>
        normalizeWorks(entry.works).flatMap((work) => work.images ?? []),
      );
      await deleteR2Images([
        ...(character.images ?? []),
        ...worldImages,
        ...workImages,
        ...worldWorkImages,
      ]);
      await deleteDoc(doc(getFirebaseDb(), "characters", character.id));
      setActiveCharacterId("");
      setDraft(createBlankDraft(activeCharacterKind));
      onNotice(`${character.name} 데이터를 Cloudflare R2와 Firestore에서 삭제했어요.`);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "자캐 삭제에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    characters,
    charactersRef,
    activeCharacterId,
    setActiveCharacterId,
    activeCharacterKind,
    setActiveCharacterKind,
    activeSubPageId,
    setActiveSubPageId,
    draft,
    setDraft,
    workDraft,
    setWorkDraft,
    activeCharacter,
    filteredCharacters,
    pairLinkableCharacters,
    canRecoverLegacyPairMember,
    kindLabel,
    isPairDraft,
    loadCharacterDraft,
    selectCharacterFromList,
    startNewCharacter,
    handleActiveKindChange,
    reloadCharacterFromServer,
    saveCharacter,
    recoverLegacyPairMemberData,
    deleteCharacter,
  };
};
