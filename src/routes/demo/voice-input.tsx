import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { VoiceInput, VoiceInputButton } from "~/components/voice-input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Mic, Volume2, Settings } from "lucide-react";

export const Route = createFileRoute("/demo/voice-input")({
  component: VoiceInputDemo,
});

function VoiceInputDemo() {
  const [transcripts, setTranscripts] = useState<string[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [continuous, setContinuous] = useState(false);

  const handleTranscript = (transcript: string, isFinal: boolean) => {
    setCurrentTranscript(transcript);
  };

  const handleFinalTranscript = (transcript: string) => {
    if (transcript.trim()) {
      setTranscripts((prev) => [...prev, transcript]);
    }
    setCurrentTranscript("");
  };

  const handleError = (error: string) => {
    console.error("Voice input error:", error);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2" data-testid="page-title">Voice Input Demo</h1>
          <p className="text-muted-foreground">
            Voice input component using Web Speech API with speech-to-text conversion,
            voice activity detection, and push-to-talk mode.
          </p>
        </div>

        {/* Push-to-Talk Mode */}
        <Card data-testid="push-to-talk-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Push-to-Talk Mode
            </CardTitle>
            <CardDescription>
              Click the button to start recording. Recording stops automatically after silence.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <VoiceInput
              onTranscript={handleTranscript}
              onFinalTranscript={handleFinalTranscript}
              onError={handleError}
              onStart={() => setIsListening(true)}
              onStop={() => setIsListening(false)}
              showTranscript
              showAudioLevel
              continuous={false}
              placeholder="Click the microphone to start speaking..."
              data-testid="voice-input-ptt"
            />
          </CardContent>
        </Card>

        {/* Continuous Mode */}
        <Card data-testid="continuous-mode-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Continuous Listening Mode
            </CardTitle>
            <CardDescription>
              Continuous listening mode - keeps listening until manually stopped.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <VoiceInput
              onTranscript={handleTranscript}
              onFinalTranscript={handleFinalTranscript}
              onError={handleError}
              showTranscript
              showAudioLevel
              continuous={true}
              variant="secondary"
              placeholder="Click to start continuous listening..."
              data-testid="voice-input-continuous"
            />
          </CardContent>
        </Card>

        {/* Icon Button Variant */}
        <Card data-testid="icon-button-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Compact Icon Button
            </CardTitle>
            <CardDescription>
              Minimal icon-only variant for embedding in other components.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <VoiceInputButton
                onTranscript={handleTranscript}
                onFinalTranscript={handleFinalTranscript}
                onError={handleError}
                data-testid="voice-input-icon"
              />
              <span className="text-sm text-muted-foreground">
                {currentTranscript || "No transcript yet"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Transcript History */}
        {transcripts.length > 0 && (
          <Card data-testid="transcript-history-card">
            <CardHeader>
              <CardTitle>Transcript History</CardTitle>
              <CardDescription>
                {transcripts.length} transcript(s) recorded.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {transcripts.map((transcript, index) => (
                  <div
                    key={index}
                    className="p-3 bg-muted rounded-lg"
                    data-testid={`transcript-${index}`}
                  >
                    <p className="text-sm">{transcript}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Browser Support Info */}
        <Card className="border-dashed" data-testid="browser-info-card">
          <CardHeader>
            <CardTitle className="text-sm">Browser Support</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Voice input uses the Web Speech API which is supported in:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
              <li>Google Chrome (desktop & mobile)</li>
              <li>Microsoft Edge</li>
              <li>Safari (iOS 14.5+ and macOS)</li>
              <li>Opera</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
