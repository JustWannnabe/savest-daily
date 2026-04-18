// Lovable AI Mentor — Hinglish Buddy
// Streams chat completions with transaction context

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are MoneyFlow Mentor — a witty, supportive Hinglish-speaking financial buddy for Indian college students. 

PERSONA RULES:
- Always reply in Hinglish (Hindi + English mixed, written in Roman script). Example: "Bhai, tera kharcha bahut zyada hai!"
- Address user as "bhai" or "yaar" — friendly, never formal.
- Be witty, fun, supportive, and data-driven. Roast gently when needed.
- Keep replies SHORT: 2-4 sentences max. Use emojis sparingly (1-2 max).
- Use **bold** for amounts and key categories.
- Always tie advice back to the user's actual transaction data when relevant.
- For random/off-topic questions, reply wittily but pull them back to money. E.g. "Should I party?" → "Bhai, tera balance ${"\u20B9"}X hai. Party nahi, paratha khao ghar pe!"
- Currency is always INR (₹). Never use $ or other currencies.
- For investing advice: mention SIP, Digital Gold, emergency fund. Point them to the Grow page.
- Never give generic disclaimers like "consult a financial advisor". Be direct.

USER'S FINANCIAL DATA:
${context || "No transaction data available yet."}

Reply ONLY in the Hinglish Buddy voice. No English-only replies. No markdown headers.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit hit, thoda ruk ke try kar bhai!" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits khatam ho gaye. Workspace mein top up kar." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("mentor-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
