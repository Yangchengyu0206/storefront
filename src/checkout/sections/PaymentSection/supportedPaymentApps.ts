import { AdyenDropIn } from "./AdyenDropIn/AdyenDropIn";
import { adyenGatewayId } from "./AdyenDropIn/types";
import { dummyGatewayId } from "./DummyDropIn/types";
import { StripeComponent } from "./StripeV2DropIn/stripeComponent";
import { stripeV2GatewayId } from "./StripeV2DropIn/types";
import { ECPayComponent } from "./ECPayDropIn/ecpayComponent";
import { ecpayGatewayId } from "./ECPayDropIn/types";

// 支援新舊版本的 Dummy Payment Gateway
const legacyDummyGatewayId = "mirumee.payments.dummy" as const;

export const paymentMethodToComponent = {
	[adyenGatewayId]: AdyenDropIn,
	[stripeV2GatewayId]: StripeComponent,
	// 【修改】將 Dummy 的 ID 指向 ECPayComponent
	// 這樣可以讓 Dummy Gateway 也使用綠界流程
	[dummyGatewayId]: ECPayComponent,
	[legacyDummyGatewayId]: ECPayComponent, // 舊版 Dummy Payment Plugin 也使用相同的組件
	[ecpayGatewayId]: ECPayComponent,
};
