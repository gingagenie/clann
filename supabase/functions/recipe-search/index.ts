const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { meal } = await req.json()

    if (!meal || typeof meal !== 'string') {
      return ok({ error: 'meal name is required' })
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return ok({ error: 'ANTHROPIC_API_KEY secret not set' })
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
          content: `List the shopping ingredients for "${meal}" for a family of 4. Be practical — if a family would realistically use a shortcut (e.g. a jar of tikka masala sauce, a packet of taco seasoning, store-bought pastry, pre-made stock), list that instead of the individual spices and components. Only list what someone actually needs to buy at the supermarket, not pantry staples like salt, pepper, or oil unless they are a key ingredient. Return ONLY a valid JSON array, no other text. Format: [{"name":"ingredient","quantity":"amount"}]. Use Australian conventions: metric quantities (grams, ml, kg, L — not cups), Australian ingredient names (capsicum not bell pepper, coriander not cilantro, plain flour not all-purpose flour, tomato sauce not ketchup).`,
        }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Anthropic error:', err)
      return ok({ error: `Anthropic API error ${response.status}: ${err}` })
    }

    const data = await response.json()
    const text: string = data.content[0].text.trim()

    const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

    let ingredients: { name: string; quantity: string }[]
    try {
      ingredients = JSON.parse(clean)
    } catch {
      console.error('Failed to parse AI response:', text)
      return ok({ error: `Could not parse AI response: ${text.slice(0, 200)}` })
    }

    return ok({ ingredients })
  } catch (err) {
    console.error('Edge function error:', err)
    return ok({ error: `Internal error: ${err}` })
  }
})
