import { ProductListSkeleton } from "@/ui/components/ProductListSkeleton";

export default function Loading() {
	return (
		<section className="mx-auto max-w-7xl p-8 pb-16">
			<ProductListSkeleton count={9} />
		</section>
	);
}
