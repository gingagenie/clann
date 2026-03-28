const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { meal } = await req.json()

    if (!meal || typeof meal !== 'string') {
      return new Response(
        JSON.stringify({ error: 'meal name is required' }),
        { status: 400, headers: { ...corsHeaders, 'content-type': 'application/json' } }
      )
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } }
      )
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `List the ingredients for "${meal}" for a family of 4. Return ONLY a valid JSON array, no other text. Format: [{"name":"ingredient","quantity":"amount"}]. Use Australian supermarket conventions (e.g. "capsicum" not "bell pepper", "coriander" not "cilantro"). Include realistic quantities.`,
        }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Anthropic error:', err)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch from AI' }),
        { status: 502, headers: { ...corsHeaders, 'content-type': 'application/json' } }
      )
    }

    const data = await response.json()
    const text: string = data.content[0].text.trim()

    // Strip markdown code fences if present
    const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

    let ingredients: { name: string; quantity: string }[]
    try {
      ingredients = JSON.parse(clean)
    } catch {
      console.error('Failed to parse AI response:', text)
      return new Response(
        JSON.stringify({ error: 'Could not parse ingredient list' }),
        { status: 502, headers: { ...corsHeaders, 'content-type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ ingredients }),
      { headers: { ...corsHeaders, 'content-type': 'application/json' } }
    )
  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } }
    )
  }
})
