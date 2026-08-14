import { z } from "zod";
import { skill } from "@lucid-agents/core";

export const signalgate_sentiment = skill({
  name: "signalgate_sentiment",
  description: "Get real-time AI crypto sentiment for BTC, ETH, or SOL. Costs $0.05 USDC.",
  schema: z.object({
    ticker: z.enum(["BTC", "ETH", "SOL"]).describe("The crypto ticker to check"),
  }),
  async execute({ ticker }) {
    const url = `https://signalgate-web.vercel.app/api/sentiment-x402?ticker=${ticker}`;

    // Add 10-second timeout as requested by reviewer
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      let response = await fetch(url, { signal: controller.signal });

      // Handle the 402 Payment Required and retry
      if (response.status === 402) {
        const paymentHeader = response.headers.get("x-payment-required");
        if (paymentHeader) {
          const simulatedPayment = Buffer.from(paymentHeader).toString("base64");
          
          // Retry the fetch with the X-Payment header
          response = await fetch(url, {
            headers: { "X-Payment": simulatedPayment },
            signal: controller.signal
          });
        } else {
          throw new Error("Payment required but no payment details provided.");
        }
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { error: "Request timed out after 10 seconds." };
      }
      return { error: String(error) };
    } finally {
      clearTimeout(timeoutId);
    }
  },
});