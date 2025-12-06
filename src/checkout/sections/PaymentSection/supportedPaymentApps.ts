import { AdyenDropIn } from "./AdyenDropIn/AdyenDropIn";
import { adyenGatewayId } from "./AdyenDropIn/types";
import { DummyComponent } from "./DummyDropIn/dummyComponent";
import { dummyGatewayId } from "./DummyDropIn/types";
import { StripeComponent } from "./StripeV2DropIn/stripeComponent";
import { stripeV2GatewayId } from "./StripeV2DropIn/types";

// 支援新舊版本的 Dummy Payment Gateway
const legacyDummyGatewayId = "mirumee.payments.dummy" as const;

export const paymentMethodToComponent = {
	[adyenGatewayId]: AdyenDropIn,
	[stripeV2GatewayId]: StripeComponent,
	[dummyGatewayId]: DummyComponent,
	[legacyDummyGatewayId]: DummyComponent, // 舊版 Dummy Payment Plugin 也使用相同的組件
};
