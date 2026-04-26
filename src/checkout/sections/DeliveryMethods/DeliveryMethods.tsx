import React from "react";
import { Title } from "@/checkout/components/Title";
import { useCheckout } from "@/checkout/hooks/useCheckout";
import { SelectBox } from "@/checkout/components/SelectBox";
import { SelectBoxGroup } from "@/checkout/components/SelectBoxGroup";
import { getFormattedMoney } from "@/checkout/lib/utils/money";
import { Divider } from "@/checkout/components/Divider";
import { type CommonSectionProps } from "@/checkout/lib/globalTypes";
import { useDeliveryMethodsForm } from "@/checkout/sections/DeliveryMethods/useDeliveryMethodsForm";
import { FormProvider } from "@/checkout/hooks/useForm/FormProvider";
import { useCheckoutUpdateState } from "@/checkout/state/updateStateStore";
import { DeliveryMethodsSkeleton } from "@/checkout/sections/DeliveryMethods/DeliveryMethodsSkeleton";
import { useUser } from "@/checkout/hooks/useUser";
import { CvsStoreSelector } from "@/checkout/sections/EcpayLogistics/CvsStoreSelector";

export const DeliveryMethods: React.FC<CommonSectionProps> = ({ collapsed }) => {
	const { checkout } = useCheckout();
	const { authenticated } = useUser();
	const { shippingMethods, shippingAddress } = checkout;
	const form = useDeliveryMethodsForm();
	const { updateState } = useCheckoutUpdateState();
	const selectedMethod = shippingMethods?.find((m) => m.id === form.values.selectedMethodId);
	const isCvs = selectedMethod?.name?.includes("超商");

	const getSubtitle = ({ min, max }: { min?: number | null; max?: number | null }) => {
		if (!min || !max) {
			return undefined;
		}

		return `${min}-${max} 個工作天`;
	};

	if (!checkout?.isShippingRequired || collapsed) {
		return null;
	}

	return (
		<FormProvider form={form}>
			<Divider />
			<div className="py-4" data-testid="deliveryMethods">
				<Title className="mb-2">運送方式</Title>
				{!authenticated && !shippingAddress && <p>請先填寫收件地址以查看可用的運送方式</p>}
				{authenticated && !shippingAddress && updateState.checkoutShippingUpdate ? (
					<DeliveryMethodsSkeleton />
				) : (
					<>
						<SelectBoxGroup label="delivery methods">
							{shippingMethods?.map(
								({ id, name, price, minimumDeliveryDays: min, maximumDeliveryDays: max }) => (
									<SelectBox key={id} name="selectedMethodId" value={id}>
										<div className="pointer-events-none flex min-h-12 grow flex-col justify-center">
											<div className="flex flex-row items-center justify-between self-stretch">
												<p>{name}</p>
												<p>{getFormattedMoney(price)}</p>
											</div>
											<p className="font-xs" color="secondary">
												{getSubtitle({ min, max })}
											</p>
										</div>
									</SelectBox>
								),
							)}
						</SelectBoxGroup>
						{isCvs && <CvsStoreSelector />}
					</>
				)}
			</div>
		</FormProvider>
	);
};
