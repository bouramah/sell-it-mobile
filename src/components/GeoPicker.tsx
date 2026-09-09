import { useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import { api } from '../api/client'
import type { Commune, QuartierGeo, Region, SecteurGeo, Ville } from '../types'
import { spacing } from '../lib/theme'
import PickerField from './PickerField'

interface GeoPickerProps {
  /** secteur_geo_id sélectionné, ou null si aucun. */
  value: string | null
  onChange: (secteurGeoId: string | null) => void
}

/** Sélecteur en cascade Région → Ville → Commune → Quartier → Secteur, équivalent staff de
 * mobile-client/src/components/GeoPicker.tsx — résout vers un secteur_geo_id. Charge les
 * référentiels géographiques en une fois (petits volumes) pour filtrer localement et
 * reconstituer la chaîne de parenté quand une valeur initiale est fournie. */
export default function GeoPicker({ value, onChange }: GeoPickerProps) {
  const [regions, setRegions] = useState<Region[]>([])
  const [villes, setVilles] = useState<Ville[]>([])
  const [communes, setCommunes] = useState<Commune[]>([])
  const [quartiers, setQuartiers] = useState<QuartierGeo[]>([])
  const [secteurs, setSecteurs] = useState<SecteurGeo[]>([])
  const [loaded, setLoaded] = useState(false)

  const [regionId, setRegionId] = useState('')
  const [villeId, setVilleId] = useState('')
  const [communeId, setCommuneId] = useState('')
  const [quartierId, setQuartierId] = useState('')

  useEffect(() => {
    Promise.all([api.regions(), api.villes(), api.communes(), api.quartiersGeo(), api.secteursGeo()]).then(
      ([r, v, c, q, s]) => {
        setRegions(r)
        setVilles(v)
        setCommunes(c)
        setQuartiers(q)
        setSecteurs(s)
        setLoaded(true)
      },
    )
  }, [])

  useEffect(() => {
    if (!loaded || !value) return
    const secteur = secteurs.find((s) => s.id === value)
    if (!secteur) return
    const quartier = quartiers.find((q) => q.id === secteur.quartier_id)
    if (!quartier) return
    const commune = communes.find((c) => c.id === quartier.commune_id)
    if (!commune) return
    const ville = villes.find((v) => v.id === commune.ville_id)
    if (!ville) return
    setRegionId(ville.region_id)
    setVilleId(ville.id)
    setCommuneId(commune.id)
    setQuartierId(quartier.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, value])

  const villesFiltrees = useMemo(() => villes.filter((v) => v.region_id === regionId), [villes, regionId])
  const communesFiltrees = useMemo(() => communes.filter((c) => c.ville_id === villeId), [communes, villeId])
  const quartiersFiltres = useMemo(() => quartiers.filter((q) => q.commune_id === communeId), [quartiers, communeId])
  const secteursFiltres = useMemo(() => secteurs.filter((s) => s.quartier_id === quartierId), [secteurs, quartierId])

  return (
    <View style={{ gap: spacing.sm }}>
      <PickerField
        label="Région"
        value={regionId}
        onChange={(v) => {
          setRegionId(v)
          setVilleId('')
          setCommuneId('')
          setQuartierId('')
          onChange(null)
        }}
        options={regions.map((r) => ({ value: r.id, label: r.nom }))}
        placeholder="Sélectionner…"
      />
      <PickerField
        label="Ville"
        value={villeId}
        onChange={(v) => {
          setVilleId(v)
          setCommuneId('')
          setQuartierId('')
          onChange(null)
        }}
        options={villesFiltrees.map((v) => ({ value: v.id, label: v.nom }))}
        placeholder={regionId ? 'Sélectionner…' : 'Choisir une région d’abord'}
      />
      <PickerField
        label="Commune"
        value={communeId}
        onChange={(v) => {
          setCommuneId(v)
          setQuartierId('')
          onChange(null)
        }}
        options={communesFiltrees.map((c) => ({ value: c.id, label: c.nom }))}
        placeholder={villeId ? 'Sélectionner…' : 'Choisir une ville d’abord'}
      />
      <PickerField
        label="Quartier"
        value={quartierId}
        onChange={(v) => {
          setQuartierId(v)
          onChange(null)
        }}
        options={quartiersFiltres.map((q) => ({ value: q.id, label: q.nom }))}
        placeholder={communeId ? 'Sélectionner…' : 'Choisir une commune d’abord'}
      />
      <PickerField
        label="Secteur"
        value={value ?? ''}
        onChange={(v) => onChange(v || null)}
        options={secteursFiltres.map((s) => ({ value: s.id, label: s.nom }))}
        placeholder={quartierId ? 'Sélectionner…' : 'Choisir un quartier d’abord'}
      />
    </View>
  )
}
