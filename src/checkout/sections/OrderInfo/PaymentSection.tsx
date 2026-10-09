import { gql } from "graphql-tag";
import { useQuery } from "urql";
import { AlertIcon, SuccessIcon } from "../../assets/icons";
import { Section } from "./Section";

import { useOrder } from "@/checkout/hooks/useOrder";
import { usePaymentStatus } from "@/checkout/sections/PaymentSection/utils";
import { isSettled, parsePaymentPending } from "@/lib/payment-pending";
import { PaymentPendingInfo } from "@/ui/components/PaymentPendingInfo";

// 訂單 metadata 不在 checkout 的 OrderFragment 裡，而 checkout 的 graphql/index.ts 是凍結的
// 生成檔（codegen 未接線），所以跟 InvoiceSection／PreorderExclusionConsent 一樣手寫查詢。
// 訪客也查得到：Saleor 以訂單 ID（UUID）放行 order(id:)。
const ORDER_PAYMENT_PENDING_QUERY = gql`
	query OrderPaymentPending($id: ID!) {
		order(id: $id) {
			id
			isPaid
			chargeStatus
			metadata {
				key
				value
			}
		}
	}
`;

type PendingQueryResult = {
	order?: {
		isPaid?: boolean | null;
		chargeStatus?: string | null;
		metadata?: Array<{ key: string; value: string }> | null;
	} | null;
};

const ErrorMessage = ({ message }: { message: string }) => {
	return (
		<>
			<p className="mr-1 text-red-500">{message}</p>
			<AlertIcon />
		</>
	);
};

const SuccessMessage = ({ message }: { message: string }) => {
	return (
		<>
			<p color="success" className="mr-1">
				{message}
			</p>
			<SuccessIcon />
		</>
	);
};

export const PaymentSection = () => {
	const { order } = useOrder();
	const paymentStatus = usePaymentStatus(order);

	// ATM／超商代碼取號後由伺服器替客人建的單：繳費帳號在訂單 metadata 裡。
	const [{ data }] = useQuery<PendingQueryResult>({
		query: ORDER_PAYMENT_PENDING_QUERY,
		variables: { id: order?.id },
		pause: !order?.id,
		requestPolicy: "cache-and-network",
	});
	const pendingOrder = data?.order;
	const pending =
		pendingOrder && !isSettled(pendingOrder.chargeStatus, pendingOrder.isPaid)
			? parsePaymentPending(pendingOrder.metadata)
			: null;

	return (
		<Section title="付款">
			<div data-testid="paymentStatus">
				{pending && <PaymentPendingInfo info={pending} />}
				<div className="flex flex-row items-center">
					{paymentStatus === "authorized" && <SuccessMessage message="已收到您的付款授權" />}

					{paymentStatus === "paidInFull" && <SuccessMessage message="已收到您的付款" />}

					{paymentStatus === "overpaid" && (
						<ErrorMessage message="這筆訂單的付款金額超過應付金額，可能是付款過程出了問題，請聯絡客服協助處理。" />
					)}
				</div>
			</div>
		</Section>
	);
};
