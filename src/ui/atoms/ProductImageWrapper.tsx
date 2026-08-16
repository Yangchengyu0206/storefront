import NextImage, { type ImageProps } from "next/image";
import clsx from "clsx";

/**
 * Fixed-ratio frame for product photography.
 *
 * The ratio is fixed so a grid never reflows as images arrive, and the photo
 * pushes in slightly when its card is hovered. `object-contain` is kept because
 * merchant photos are not consistently cropped; cropping them to fill would cut
 * product edges off.
 */
export const ProductImageWrapper = ({ className, ...props }: ImageProps) => {
	return (
		<div className="aspect-square overflow-hidden bg-ink-100">
			<NextImage
				{...props}
				className={clsx(
					"h-full w-full object-contain object-center p-3 transition-transform duration-300 ease-standard group-hover:scale-[1.03]",
					"motion-reduce:transition-none motion-reduce:group-hover:scale-100",
					className,
				)}
			/>
		</div>
	);
};
