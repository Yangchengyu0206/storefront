import { type FallbackProps } from "react-error-boundary";
import { Button } from "@/checkout/components/Button";
import { ErrorContentWrapper } from "@/checkout/components/ErrorContentWrapper";

const storeName = process.env.NEXT_PUBLIC_SELLER_NAME || "本店";

export const PageNotFound = ({ error }: Partial<FallbackProps>) => {
	console.error(error);

	// eslint-disable-next-line no-restricted-globals
	const goBack = () => history.back();

	return (
		<ErrorContentWrapper>
			{/* This used to render the commerce vendor's logo, on a page a customer
			    of {storeName} would only ever reach mid-checkout. It now shows the
			    store's own name, and the copy is in the language the rest of the
			    site is written in. */}
			<p className="text-lg font-semibold text-ink-900">{storeName}</p>
			<p className="text-ink-600">讀不到這筆結帳資料，可能是連結已過期或已完成結帳。</p>
			<Button ariaLabel="回到商店" onClick={goBack} variant="secondary" label="回到商店" />
		</ErrorContentWrapper>
	);
};
