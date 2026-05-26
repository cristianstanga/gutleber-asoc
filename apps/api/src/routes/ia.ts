import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'

const router = Router()

router.post('/generar-descripcion', async (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY no configurada en el servidor.' })
  }

  const {
    tipo, direccion, barrio, superficie, dormitorios, banos,
    cochera, piso, antiguedad, enAlquiler, enVenta,
    alquilerBase, valorVenta, caracteristicas = [],
  } = req.body

  const tipoLabel: Record<string, string> = {
    DEPARTAMENTO: 'Departamento', CASA: 'Casa', LOCAL: 'Local comercial',
    TERRENO: 'Terreno', OFICINA: 'Oficina',
  }

  const detalles = [
    `Tipo: ${tipoLabel[tipo] ?? tipo}`,
    `Dirección: ${direccion}${barrio ? `, ${barrio}` : ''}, Posadas, Misiones`,
    superficie ? `Superficie: ${superficie} m²` : null,
    dormitorios ? `Dormitorios: ${dormitorios}` : null,
    banos ? `Baños: ${banos}` : null,
    cochera ? 'Cochera incluida' : null,
    piso ? `Piso/Unidad: ${piso}` : null,
    antiguedad ? `Antigüedad: ${antiguedad} años` : null,
    enAlquiler && alquilerBase ? `Alquiler: $${Number(alquilerBase).toLocaleString('es-AR')} ARS/mes` : null,
    enVenta && valorVenta ? `Precio de venta: USD ${Number(valorVenta).toLocaleString('es-AR')}` : null,
    caracteristicas.length ? `Características: ${caracteristicas.join(', ')}` : null,
  ].filter(Boolean).join('\n')

  const operacion = enAlquiler && enVenta ? 'alquiler y venta'
    : enAlquiler ? 'alquiler' : 'venta'

  const prompt = `Sos el redactor de una inmobiliaria boutique argentina llamada "Gutleber & Asoc." con sede en Posadas, Misiones. Tu estilo es elegante, sobrio y directo — sin frases hechas ni adjetivos vacíos.

Generá tres textos para una propiedad en ${operacion}:

DATOS DE LA PROPIEDAD:
${detalles}

Generá exactamente este JSON (sin markdown, solo JSON puro):
{
  "instagram": "<caption para Instagram: máximo 220 caracteres, tono aspiracional y elegante, sin emojis en exceso, terminá con #gutleber #posadas>",
  "whatsapp": "<mensaje para WhatsApp: directo, informativo, máximo 300 caracteres, incluye los datos clave y termina con un CTA suave>",
  "descripcion": "<descripción pública completa: 3-4 oraciones bien escritas, resalta lo más valioso de la propiedad y la zona, tono boutique pero accesible>"
}`

  try {
    const client = new Anthropic({ apiKey: key })
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (msg.content[0] as { type: string; text: string }).text.trim()
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed = JSON.parse(clean)
    res.json(parsed)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    res.status(500).json({ error: `Error al generar descripción: ${msg}` })
  }
})

export default router
