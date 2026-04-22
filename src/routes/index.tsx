import { createFileRoute } from "@tanstack/react-router";
import { Mic, MicOff, MapPin } from "lucide-react";
import { Background } from "@/components/jarvis/Background";
import { JarvisCore3D } from "@/components/jarvis/JarvisCore3D";
import { Panel, StatRow, Bar, MiniGraph } from "@/components/jarvis/Panel";
import { Waveform } from "@/components/jarvis/Waveform";
import { Radar } from "@/components/jarvis/Radar";
import { BottomNav } from "@/components/jarvis/BottomNav";
import { useClock, useLiveMetric } from "@/hooks/use-clock";
import { useVoiceRecognition } from "@/hooks/use-voice";
import { useLocation } from "@/hooks/use-location";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "JARVIS — Stark Industries AI Interface" },
      {
        name: "description",
        content:
          "JARVIS holographic AI control interface — cinematic 3D core, voice recognition, and live telemetry.",
      },
    ],
  }),
});

function Index() {
  const { time, date } = useClock();
  const coreTemp = useLiveMetric(36.4, 38.1, 0.2);
  const memory = useLiveMetric(38, 56, 1.2);
  const processor = useLiveMetric(18, 42, 1.5);
  const voice = useVoiceRecognition();
  const loc = useLocation();
  const lastCommand = voice.logs[0];

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Share+Tech+Mono&display=swap"
      />
      <Background />

      {/* ============ FULL-SCREEN 3D CORE LAYER ============ */}
      <div className="fixed inset-0 z-0">
        <JarvisCore3D />
      </div>

      {/* ============ HUD OVERLAY LAYER ============ */}
      <main className="relative z-10 h-screen w-screen overflow-hidden p-5">
        {/* TOP BAR */}
        <header className="flex items-start justify-between gap-4">
          <div className="font-display text-[10px] tracking-[0.45em] text-hud-cyan/60 animate-flicker">
            ◣ STARK NETWORK · NODE 001 · SECURE
          </div>
          <div className="text-center">
            <div className="font-display text-sm font-bold tracking-[0.6em] text-hud-cyan hud-text-glow">
              STARK INDUSTRIES
            </div>
            <div className="mt-0.5 font-mono text-[9px] tracking-[0.5em] text-muted-foreground">
              JARVIS · MARK II
            </div>
          </div>
          <div className="font-display text-[10px] tracking-[0.45em] text-hud-cyan/60 animate-flicker text-right">
            AES-512 · ENCRYPTED ◢
          </div>
        </header>

        {/* MAIN GRID — slim rails, hero center */}
        <div className="mt-4 grid h-[calc(100vh-10rem)] grid-cols-12 gap-4">
          {/* ============ LEFT RAIL ============ */}
          <aside className="col-span-3 flex flex-col gap-3">
            {/* TIME (moved here, cleaner top) */}
            <Panel>
              <div className="flex items-baseline justify-between">
                <div className="font-display text-3xl font-bold text-foreground hud-text-glow tabular-nums">
                  {time.split(" ")[0]}
                </div>
                <div className="font-display text-[10px] tracking-[0.3em] text-hud-cyan">
                  {time.split(" ")[1]}
                </div>
              </div>
              <div className="mt-1 font-mono text-[10px] tracking-[0.3em] text-muted-foreground">
                {date.toUpperCase()}
              </div>
            </Panel>

            {/* SYSTEM STATUS — minimal */}
            <Panel title="SYSTEM">
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full bg-hud-green animate-pulse-glow"
                  style={{ boxShadow: "0 0 12px var(--hud-green)" }}
                />
                <span className="font-display text-base tracking-[0.3em] text-hud-green hud-text-glow">
                  ONLINE
                </span>
                <span className="ml-auto font-mono text-[10px] tracking-widest text-muted-foreground">
                  v2.0.0
                </span>
              </div>
            </Panel>

            {/* TELEMETRY */}
            <Panel title="TELEMETRY">
              <div className="space-y-3">
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] tracking-[0.3em] text-muted-foreground">
                      CORE TEMP
                    </span>
                    <span className="font-display text-sm text-foreground hud-text-glow tabular-nums">
                      {coreTemp.toFixed(1)}°C
                    </span>
                  </div>
                  <div className="mt-1">
                    <MiniGraph seed={1} />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] tracking-[0.3em] text-muted-foreground">
                      MEMORY
                    </span>
                    <span className="font-display text-sm text-foreground hud-text-glow tabular-nums">
                      {memory.toFixed(0)}%
                    </span>
                  </div>
                  <div className="mt-1">
                    <Bar value={memory} />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] tracking-[0.3em] text-muted-foreground">
                      PROCESSOR
                    </span>
                    <span className="font-display text-sm text-foreground hud-text-glow tabular-nums">
                      {processor.toFixed(0)}%
                    </span>
                  </div>
                  <div className="mt-1">
                    <Bar value={processor} />
                  </div>
                </div>
              </div>
            </Panel>

            {/* VOICE — moved up, prominent */}
            <Panel title="VOICE INTERFACE" className="mt-auto">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-1.5 w-1.5 animate-pulse-glow ${
                      voice.listening ? "bg-hud-green" : "bg-muted-foreground"
                    }`}
                  />
                  <span
                    className={`font-display text-[10px] tracking-[0.3em] ${
                      voice.listening ? "text-hud-green" : "text-muted-foreground"
                    }`}
                  >
                    {voice.supported
                      ? voice.listening
                        ? "LISTENING"
                        : "STANDBY"
                      : "UNSUPPORTED"}
                  </span>
                </div>
                {voice.supported && (
                  <button
                    onClick={voice.listening ? voice.stop : voice.start}
                    className="group flex items-center gap-1.5 border border-hud-cyan/40 bg-hud-cyan/5 px-2 py-1 transition-all hover:border-hud-cyan hover:bg-hud-cyan/15"
                    style={{ boxShadow: "0 0 12px oklch(0.85 0.18 220 / 0.2)" }}
                  >
                    {voice.listening ? (
                      <MicOff className="h-3 w-3 text-hud-orange" />
                    ) : (
                      <Mic className="h-3 w-3 text-hud-cyan" />
                    )}
                    <span className="font-display text-[9px] tracking-[0.3em] text-foreground">
                      {voice.listening ? "STOP" : "ACTIVATE"}
                    </span>
                  </button>
                )}
              </div>
              <Waveform bars={36} active={voice.listening} />
              {voice.interim && (
                <div className="mt-2 text-[10px] tracking-wider text-hud-cyan/80 italic truncate">
                  ▸ {voice.interim}
                </div>
              )}
              <div className="mt-2 border-t border-hud-cyan/10 pt-2">
                <div className="text-[9px] tracking-[0.3em] text-muted-foreground">
                  LAST COMMAND
                </div>
                <div className="font-display text-[11px] tracking-wider text-foreground min-h-[1.25rem] truncate">
                  {lastCommand
                    ? `▸ ${lastCommand.text}`
                    : voice.error
                      ? `▸ ${voice.error.toUpperCase()}`
                      : "▸ AWAITING INPUT . . ."}
                </div>
              </div>
            </Panel>
          </aside>

          {/* ============ CENTER (empty — 3D core shows through) ============ */}
          <section className="col-span-6 relative pointer-events-none">
            {/* Bottom-center JARVIS dialog */}
            <div className="absolute bottom-0 left-1/2 w-[90%] max-w-md -translate-x-1/2 pointer-events-auto">
              <Panel>
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-display text-[10px] tracking-[0.4em] text-hud-cyan">
                    ▸ JARVIS
                  </span>
                  <span className="text-[9px] tracking-[0.3em] text-muted-foreground animate-flicker">
                    {voice.listening ? "LISTENING . . ." : "STANDING BY"}
                  </span>
                </div>
                <div className="font-display text-sm tracking-[0.15em] text-foreground hud-text-glow">
                  {lastCommand
                    ? `ACKNOWLEDGED: "${lastCommand.text}"`
                    : "GOOD MORNING, SIR."}
                </div>
                <div className="font-display text-xs tracking-[0.15em] text-foreground/80">
                  {lastCommand
                    ? "PROCESSING REQUEST . . ."
                    : "HOW CAN I ASSIST YOU TODAY?"}
                </div>
              </Panel>
            </div>
          </section>

          {/* ============ RIGHT RAIL ============ */}
          <aside className="col-span-3 flex flex-col gap-3">
            {/* LOCATION — hero treatment */}
            <Panel title="LOCATION">
              <div className="flex items-start gap-2">
                <MapPin
                  className={`mt-0.5 h-4 w-4 ${loc.loading ? "text-hud-orange animate-pulse-glow" : "text-hud-cyan"}`}
                />
                <div className="flex-1">
                  <div className="font-display text-base tracking-[0.2em] text-foreground hud-text-glow truncate">
                    {loc.city}
                  </div>
                  {loc.region && loc.region !== "—" && (
                    <div className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground truncate">
                      {loc.region}
                    </div>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-display text-[10px] tracking-[0.3em] text-hud-cyan">
                      {loc.country}
                    </span>
                    {loc.countryCode !== "—" && (
                      <span className="border border-hud-cyan/40 px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-hud-cyan">
                        {loc.countryCode}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {loc.loading && (
                <div className="mt-2 text-[9px] tracking-[0.3em] text-hud-orange animate-flicker">
                  ◉ TRIANGULATING SIGNAL . . .
                </div>
              )}
            </Panel>

            {/* DIAGNOSTICS */}
            <Panel title="DIAGNOSTICS">
              <StatRow label="ARC REACTOR" value="100%" status="online" />
              <StatRow label="SUIT" value="ONLINE" status="online" />
              <StatRow label="WEAPONS" value="ONLINE" status="online" />
              <StatRow label="PROPULSION" value="ONLINE" status="online" />
              <StatRow label="SENSORS" value="ACTIVE" status="online" />
              <StatRow label="COMMS" value="ONLINE" status="online" />
            </Panel>

            {/* ENVIRONMENT + RADAR */}
            <Panel title="ENVIRONMENT" className="mt-auto">
              <div className="flex gap-3">
                <div className="flex-1 space-y-0.5">
                  <StatRow label="TEMP" value="22°C" />
                  <StatRow label="HUMIDITY" value="45%" />
                  <StatRow label="PRESSURE" value="1013" />
                  <StatRow label="WIND" value="6 km/h" />
                </div>
                <Radar />
              </div>
            </Panel>
          </aside>
        </div>

        {/* BOTTOM NAV */}
        <footer className="absolute inset-x-5 bottom-5">
          <BottomNav />
        </footer>
      </main>
    </>
  );
}
