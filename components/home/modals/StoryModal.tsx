"use client";

import { GlitchedText } from "@/components/GlitchedText";
import { StoryFormattedText } from "@/components/StoryFormattedText";
import { DocumentSheet } from "@/components/home/DocumentSheet";
import { settingSectionGlitchPath, settingSectionTitleGlitchPath } from "@/lib/glitch-fields";
import { splitStoryParagraphs } from "@/lib/story-text";
import type { CharacterDetailSection } from "@/lib/zone-links";
import type { StoryModalItem } from "@/types/home.types";
import { cn } from "@/utils/cn";

interface StoryModalProps {
  item: StoryModalItem;
  onClose: () => void;
  className?: string;
}

export function StoryModal({ item, onClose, className }: StoryModalProps) {
  const { character, section } = item;
  const glitchPath = settingSectionGlitchPath(section.id);
  const glitch = character.textGlitch?.[glitchPath];
  const titleGlitch = character.textGlitch?.[settingSectionTitleGlitchPath(section.id)];
  const paragraphs = splitStoryParagraphs(section.body);
  const linkContext = {
    section: "characters" as CharacterDetailSection,
    characterId: character.id,
  };

  return (
    <div
      className={cn("desk-backdrop fixed inset-0 z-50 grid place-items-center p-4", className)}
      role="dialog"
      aria-modal="true"
      aria-label={`${section.title || "스토리"} 기록 열람`}
      onClick={onClose}
    >
      <DocumentSheet
        tabLabel="LOG"
        className="story-log-viewer story-viewer flex h-[92vh] w-full max-w-5xl flex-col"
      >
        <div className="story-viewer-header flex items-center justify-between gap-3 border-b border-white/15 bg-black p-4">
          <div>
            <p className="archive-kicker">Story Log / {character.name}</p>
            <h3 className="archive-title mt-1 text-3xl whitespace-pre-line">
              {section.title ? (
                <GlitchedText text={section.title} glitch={titleGlitch} preserveWhitespace />
              ) : (
                "기록된 서사"
              )}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="archive-submit-button px-3 py-2 text-sm"
          >
            닫기
          </button>
        </div>

        <article className="story-viewer-body min-h-0 flex-1 overflow-y-auto overscroll-contain !bg-black">
          <div className="story-viewer-content px-6 py-8 md:px-10 md:py-10">
            {paragraphs.length > 0 ? (
              paragraphs.map((paragraph, index) => (
                <p key={index} className="story-viewer-paragraph">
                  <StoryFormattedText
                    text={paragraph}
                    glitch={glitch}
                    preserveWhitespace
                    linkContext={linkContext}
                  />
                </p>
              ))
            ) : (
              <p className="story-viewer-paragraph plain-empty-note">내용이 없어요.</p>
            )}
          </div>
        </article>
      </DocumentSheet>
    </div>
  );
}
