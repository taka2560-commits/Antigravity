import { MapContainer, TileLayer, CircleMarker, Popup, useMap, useMapEvents } from 'react-leaflet'
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "../db"
import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent } from "./ui/card"
import { Button } from "./ui/button"
import { Locate, Layers, Maximize, Minimize, Map as MapIcon, Grid, Search } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "./ui/dialog"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { SimplePlot } from "./SimplePlot"
import { cn } from "../lib/utils"
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default marker icon in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// URL constants for Tile Layers
const TILE_LAYERS = {
    google_std: {
        name: "Google Maps (道路)",
        url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
        attribution: "&copy; Google Maps",
        maxNativeZoom: 21
    },
    google_hyb: {
        name: "Google Maps (航空)",
        url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
        attribution: "&copy; Google Maps",
        maxNativeZoom: 21
    },
    std: {
        name: "地理院地図 (標準)",
        url: "https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png",
        attribution: "<a href='https://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院タイル</a>",
        maxNativeZoom: 18
    },
    pale: {
        name: "地理院地図 (淡色)",
        url: "https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png",
        attribution: "<a href='https://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院タイル</a>",
        maxNativeZoom: 18
    },
    photo: {
        name: "地理院地図 (写真)",
        url: "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg",
        attribution: "<a href='https://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院タイル</a>",
        maxNativeZoom: 18
    },
    dark: {
        name: "OpenStreetMap (Dark)",
        url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxNativeZoom: 19
    }
}

// Map Click Handler
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lon: number) => void }) {
    useMapEvents({
        click: (e) => {
            onMapClick(e.latlng.lat, e.latlng.lng)
        }
    })
    return null
}

// Component to handle map movement and state persistence
function MapController({ center, zoom, onMoveEnd }: { center: [number, number] | null, zoom: number, onMoveEnd: (center: L.LatLng, zoom: number) => void }) {
    const map = useMap()

    // Fly to center if externally changed (e.g. Locate Me or Highlight)
    useEffect(() => {
        if (center) {
            map.flyTo(center, zoom)
        }
    }, [center, zoom, map])

    // Track movement
    useMapEvents({
        moveend: () => {
            onMoveEnd(map.getCenter(), map.getZoom())
        }
    })

    return null
}

const STORAGE_KEY_CENTER = 'survey-map-center'
const STORAGE_KEY_ZOOM = 'survey-map-zoom'
const STORAGE_KEY_LAYER = 'survey-map-layer'

export function SurveyMap({ isFullScreen, setIsFullScreen }: { isFullScreen?: boolean, setIsFullScreen?: (b: boolean) => void }) {
    const points = useLiveQuery(() => db.points.toArray())

    // Initialize state from LocalStorage if available
    const [layerKey, setLayerKey] = useState<keyof typeof TILE_LAYERS>(() => {
        const saved = localStorage.getItem(STORAGE_KEY_LAYER)
        if (saved && Object.keys(TILE_LAYERS).includes(saved)) {
            return saved as keyof typeof TILE_LAYERS
        }
        return "google_std"
    })

    const [zoom, setZoom] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY_ZOOM)
        return saved ? parseInt(saved) : 15
    })

    const [mapCenter, setMapCenter] = useState<[number, number] | null>(() => {
        const saved = localStorage.getItem(STORAGE_KEY_CENTER)
        if (saved) {
            try {
                return JSON.parse(saved)
            } catch (e) { return null }
        }
        return null
    })

    const [viewMode, setViewMode] = useState<"map" | "plot">("map")

    // Internal state fallback if props are not provided (though they should be)
    const [internalIsFullScreen, setInternalIsFullScreen] = useState(false)
    const activeIsFullScreen = isFullScreen !== undefined ? isFullScreen : internalIsFullScreen
    const activeSetIsFullScreen = setIsFullScreen || setInternalIsFullScreen

    const [highlightedPointId, setHighlightedPointId] = useState<string>("all")

    const [searchQuery, setSearchQuery] = useState("")
    const [isSearching, setIsSearching] = useState(false)

    // New Point State
    const [newPoint, setNewPoint] = useState<{ lat: number, lon: number, name: string } | null>(null)

    // Memoize points to prevent infinite re-renders when setting state inside useEffect
    // Fixed: infinite loop issue
    const validPoints = useMemo(() => {
        return points?.filter(p =>
            p.lat !== undefined && p.lon !== undefined &&
            p.lat !== null && p.lon !== null &&
            !isNaN(p.lat) && !isNaN(p.lon)
        ) || []
    }, [points])

    // Initial load center logic
    useEffect(() => {
        if (!mapCenter) {
            if (validPoints.length > 0) {
                const lastPoint = validPoints[validPoints.length - 1]
                const newCenter: [number, number] = [lastPoint.lat!, lastPoint.lon!]
                setMapCenter(newCenter)
                localStorage.setItem(STORAGE_KEY_CENTER, JSON.stringify(newCenter))
            } else {
                const defaultCenter: [number, number] = [35.681236, 139.767125]
                setMapCenter(defaultCenter)
            }
        }
    }, [validPoints, mapCenter])

    // Handle Highlighting
    useEffect(() => {
        if (highlightedPointId !== "all") {
            const p = validPoints.find(pt => String(pt.id) === highlightedPointId)
            if (p) {
                // If we select a point, ensure we zoom in enough if currently zoomed out
                // But allow user to stay zoomed in if already deeper than 18
                const targetZoom = Math.max(zoom, 20)
                setMapCenter([p.lat!, p.lon!])
                setZoom(targetZoom)
            }
        }
    }, [highlightedPointId, validPoints])

    const handleLayerChange = (key: keyof typeof TILE_LAYERS) => {
        setLayerKey(key)
        localStorage.setItem(STORAGE_KEY_LAYER, key)
    }

    const handleMapMove = useCallback((center: L.LatLng, newZoom: number) => {
        localStorage.setItem(STORAGE_KEY_CENTER, JSON.stringify([center.lat, center.lng]))
        localStorage.setItem(STORAGE_KEY_ZOOM, String(newZoom))
        // We do NOT update React state here to avoid re-triggering the loop
    }, [])

    const handleLocateMe = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const newCenter: [number, number] = [position.coords.latitude, position.coords.longitude]
                    setMapCenter(newCenter)
                    setZoom(19) // Increased default zoom on locate
                    localStorage.setItem(STORAGE_KEY_CENTER, JSON.stringify(newCenter))
                    localStorage.setItem(STORAGE_KEY_ZOOM, "19")
                },
                (error) => {
                    console.error("Error getting location:", error)
                    alert("現在地を取得できませんでした。位置情報の許可を確認してください。")
                }
            )
        } else {
            alert("お使いのブラウザは位置情報をサポートしていません。")
        }
    }

    const handleAddressSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=jp`);
            const data = await response.json();
            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                const newCenter: [number, number] = [parseFloat(lat), parseFloat(lon)];
                setMapCenter(newCenter);
                setZoom(17);
                localStorage.setItem(STORAGE_KEY_CENTER, JSON.stringify(newCenter));
                localStorage.setItem(STORAGE_KEY_ZOOM, "17");
            } else {
                alert("住所が見つかりませんでした。");
            }
        } catch (error) {
            console.error("Search error:", error);
            alert("検索中にエラーが発生しました。");
        } finally {
            setIsSearching(false);
        }
    };

    const handleMapClick = (lat: number, lon: number) => {
        // Generate a default name like "Map Point 1"
        const count = (points?.length || 0) + 1
        setNewPoint({ lat, lon, name: `Map Point ${count}` })
    }

    const handleSaveNewPoint = async () => {
        if (!newPoint) return
        try {
            await db.points.add({
                name: newPoint.name,
                lat: newPoint.lat,
                lon: newPoint.lon,
                x: 0,
                y: 0,
                z: 0,
                note: "Map Click"
            })
            setNewPoint(null)
        } catch (error) {
            console.error("Failed to add point:", error)
            alert("保存に失敗しました。")
        }
    }

    const initialCenter: [number, number] = mapCenter || [35.681236, 139.767125]

    return (
        <Card className={cn(
            "border-0 shadow-none sm:border sm:shadow-sm flex flex-col relative transition-all duration-300",
            activeIsFullScreen
                ? "fixed inset-0 z-[999] h-[100dvh] w-screen rounded-none m-0 bg-background"
                : "h-[calc(100vh-200px)] min-h-[400px] w-full"
        )}>
            {/* New Point Dialog */}
            <Dialog open={!!newPoint} onOpenChange={(open) => !open && setNewPoint(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>地点登録</DialogTitle>
                        <DialogDescription>
                            地図上でクリックされた場所を登録します。
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                名称
                            </Label>
                            <Input
                                id="name"
                                value={newPoint?.name || ""}
                                onChange={(e) => setNewPoint(prev => prev ? { ...prev, name: e.target.value } : null)}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">緯度</Label>
                            <div className="col-span-3 text-sm font-mono">{newPoint?.lat.toFixed(7)}</div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">経度</Label>
                            <div className="col-span-3 text-sm font-mono">{newPoint?.lon.toFixed(7)}</div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setNewPoint(null)}>キャンセル</Button>
                        <Button onClick={handleSaveNewPoint}>登録</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Control Bar (Top Left) */}
            <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2 max-w-[calc(100%-80px)]">
                {/* Search Bar */}
                {viewMode === "map" && (
                    <div className="bg-background/90 p-1 rounded-md shadow-md border flex w-full max-w-[260px]">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddressSearch()}
                            placeholder="住所検索 (例: 東京駅)"
                            className="flex-1 bg-transparent border-none text-xs px-2 focus:outline-none min-w-0"
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={handleAddressSearch}
                            disabled={isSearching}
                        >
                            <Search className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </div>
                )}

                {/* View Switcher */}
                <div className="bg-background/90 p-1 rounded-md shadow-md border flex w-fit">
                    <Button
                        variant={viewMode === "map" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("map")}
                        className="h-7 text-xs px-2"
                    >
                        <MapIcon className="h-3 w-3 mr-1" /> 地図
                    </Button>
                    <Button
                        variant={viewMode === "plot" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("plot")}
                        className="h-7 text-xs px-2"
                    >
                        <Grid className="h-3 w-3 mr-1" /> 簡易
                    </Button>
                </div>

                {viewMode === "map" && (
                    <>
                        {/* Layer Switcher - Keep in Top Left */}
                        <div className="bg-background/90 p-1 rounded-md shadow-md border w-fit">
                            <Select value={layerKey} onValueChange={(v) => handleLayerChange(v as keyof typeof TILE_LAYERS)}>
                                <SelectTrigger className="w-[160px] h-7 text-xs bg-transparent border-0 focus:ring-0 p-1">
                                    <Layers className="h-3 w-3 mr-2 text-muted-foreground" />
                                    <SelectValue placeholder="地図切替" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(TILE_LAYERS).map(([key, layer]) => (
                                        <SelectItem key={key} value={key} className="text-xs">
                                            {layer.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </>
                )}
            </div>

            {/* Point Highlighter (Bottom Left - Moved here to avoid overlap) */}
            {viewMode === "map" && (
                <div className="absolute bottom-6 left-4 z-[400] bg-background/90 p-1 rounded-md shadow-md border w-fit max-w-[calc(100%-100px)]">
                    <Select value={highlightedPointId} onValueChange={setHighlightedPointId}>
                        <SelectTrigger className="w-[160px] h-7 text-xs bg-transparent border-0 focus:ring-0 p-1">
                            <Locate className="h-3 w-3 mr-2 text-muted-foreground" />
                            <SelectValue placeholder="点をハイライト" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                            <SelectItem value="all">(選択解除)</SelectItem>
                            {validPoints.map(p => (
                                <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                                    {p.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Action Buttons (Right Side) */}
            <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
                <Button
                    variant="secondary"
                    size="icon"
                    className="rounded-full shadow-lg h-8 w-8 bg-background/90 text-foreground border mb-2"
                    onClick={() => activeSetIsFullScreen(!activeIsFullScreen)}
                    title={activeIsFullScreen ? "全画面解除" : "全画面表示"}
                >
                    {activeIsFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                </Button>
            </div>

            {/* Locate Me (Bottom Right, Map Mode Only) */}
            {viewMode === "map" && (
                <div className="absolute bottom-6 right-4 z-[400]">
                    <Button
                        variant="secondary"
                        size="icon"
                        className="rounded-full shadow-lg h-10 w-10 bg-background/90 text-primary border"
                        onClick={handleLocateMe}
                        title="現在地へ移動"
                    >
                        <Locate className="h-5 w-5" />
                    </Button>
                </div>
            )}

            <CardContent className="p-0 flex-1 h-full relative z-0 overflow-hidden rounded-lg">
                {viewMode === "map" ? (
                    mapCenter && (
                        <MapContainer
                            center={initialCenter}
                            zoom={zoom}
                            style={{ height: "100%", width: "100%" }}
                            zoomControl={false}
                            maxZoom={24} // Allow deeper zooming
                        >
                            <TileLayer
                                attribution={TILE_LAYERS[layerKey].attribution}
                                url={TILE_LAYERS[layerKey].url}
                                maxNativeZoom={TILE_LAYERS[layerKey].maxNativeZoom} // Use native max zoom
                                maxZoom={24} // Allow client-side zoom beyond native
                            />
                            <MapController center={mapCenter} zoom={zoom} onMoveEnd={handleMapMove} />
                            <MapClickHandler onMapClick={handleMapClick} />

                            {validPoints.map(p => {
                                const isHighlighted = String(p.id) === highlightedPointId
                                return (
                                    <CircleMarker
                                        key={p.id}
                                        center={[p.lat!, p.lon!]}
                                        radius={isHighlighted ? 8 : 4}
                                        pathOptions={{
                                            color: 'white',
                                            weight: isHighlighted ? 3 : 1,
                                            fillColor: isHighlighted ? '#2563eb' : '#ef4444',
                                            fillOpacity: isHighlighted ? 1 : 0.8
                                        }}
                                    >
                                        <Popup>
                                            <div className="text-sm">
                                                <div className="font-bold mb-1">{p.name}</div>
                                                <div className="text-xs text-muted-foreground font-mono">
                                                    Lat: {p.lat?.toFixed(7)}<br />
                                                    Lon: {p.lon?.toFixed(7)}
                                                </div>
                                                {p.x !== undefined && (
                                                    <div className="text-xs text-muted-foreground font-mono mt-1 pt-1 border-t border-dashed">
                                                        X: {p.x?.toFixed(3)}<br />
                                                        Y: {p.y?.toFixed(3)}
                                                    </div>
                                                )}
                                                {p.note && <div className="mt-1 text-xs">{p.note}</div>}
                                            </div>
                                        </Popup>
                                    </CircleMarker>
                                )
                            })}
                        </MapContainer>
                    )
                ) : (
                    <div className="h-full w-full overflow-hidden">
                        <SimplePlot />
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
