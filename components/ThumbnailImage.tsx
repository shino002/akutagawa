import type { CSSProperties, ImgHTMLAttributes } from "react";
import type { UploadedImage } from "@/lib/types";
import { cn } from "@/utils/cn";

export type ThumbnailSource = Pick<UploadedImage, "thumbX" | "thumbY" | "thumbScale">;

function resolveThumbnailValues(image: ThumbnailSource) {
  return {
    x: image.thumbX ?? 50,
    y: image.thumbY ?? 50,
    scale: image.thumbScale ?? 1,
  };
}

/** 이미지 요소에 적용할 object-position만 반환합니다. */
export function thumbnailObjectStyle(image: ThumbnailSource): CSSProperties {
  const { x, y } = resolveThumbnailValues(image);
  return { objectPosition: `${x}% ${y}%` };
}

/** 썸네일 확대/위치는 img가 아닌 래퍼에 적용합니다. globals.css가 img transform을 덮어쓰기 때문입니다. */
export function thumbnailCropStyle(image: ThumbnailSource): CSSProperties {
  const { x, y, scale } = resolveThumbnailValues(image);
  return {
    transform: `scale(${scale})`,
    transformOrigin: `${x}% ${y}%`,
  };
}

/** @deprecated ThumbnailImage 컴포넌트를 사용하세요. */
export function thumbnailStyle(image: ThumbnailSource): CSSProperties {
  const { x, y, scale } = resolveThumbnailValues(image);
  return {
    objectPosition: `${x}% ${y}%`,
    transform: `scale(${scale})`,
    transformOrigin: `${x}% ${y}%`,
  };
}

type ThumbnailImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  image: ThumbnailSource;
  wrapperClassName?: string;
};

export function ThumbnailImage({
  image,
  className,
  wrapperClassName,
  style,
  ...props
}: ThumbnailImageProps) {
  return (
    <div className={cn("h-full w-full overflow-hidden", wrapperClassName)}>
      <div className="h-full w-full" style={thumbnailCropStyle(image)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- User uploads from R2 or local preview URLs. */}
        <img
          {...props}
          className={cn("h-full w-full object-cover", className)}
          style={{ ...thumbnailObjectStyle(image), ...style }}
        />
      </div>
    </div>
  );
}
