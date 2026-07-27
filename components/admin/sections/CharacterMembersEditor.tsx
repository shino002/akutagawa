"use client";

import { PairMemberPicker } from "@/components/admin/PairMemberPicker";
import { useCharactersAdmin } from "@/contexts/CharactersAdminContext";

/**
 * 페어 전용 · 연결 캐릭터(멤버) 섹션입니다.
 */
export function CharacterMembersEditor() {
  const { draft, setDraft, pairLinkableCharacters } = useCharactersAdmin();

  return (
    <>
      <div>
        <h2 className="board-title">연결 캐릭터</h2>
        <p className="mt-1 text-xs leading-5 text-emerald-100/55">
          OC 또는 어나더 항목을 선택해 페어에 연결합니다. 공개 페이지에서 각 캐릭터 상세로 이동할 수
          있어요.
        </p>
      </div>
      <PairMemberPicker
        pairMemberIds={draft.pairMemberIds}
        linkableCharacters={pairLinkableCharacters}
        currentPairId={draft.id}
        onChange={(pairMemberIds) =>
          setDraft((current) => ({
            ...current,
            pairMemberIds,
          }))
        }
      />
    </>
  );
}
