import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Download, FileText, Loader2, Languages, Video, Music } from "lucide-react";
import { transcriptionRequestSchema, type TranscriptionRequest, type Transcription } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/contexts/TranslationContext";

// Helper function to extract YouTube video ID and create embed URL
function getYouTubeEmbedUrl(url: string): string {
  // Support regular videos, shorts, and short links
  const urlPattern = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(urlPattern);
  if (match) {
    const videoId = match[1];
    return `https://www.youtube.com/embed/${videoId}`;
  }
  // Fallback to original URL if pattern doesn't match
  return url.replace("watch?v=", "embed/");
}

export default function VideoTranscription() {
  const { t } = useTranslation();
  const [transcriptionId, setTranscriptionId] = useState<string | null>(null);
  const [translationLanguage, setTranslationLanguage] = useState<string>("es");
  const { toast } = useToast();
  const hasAutoDownloadedRef = useRef<Set<string>>(new Set());

  const form = useForm<TranscriptionRequest>({
    resolver: zodResolver(transcriptionRequestSchema),
    defaultValues: {
      url: "",
    },
  });

  // Poll for transcription status
  const { data: transcriptionData } = useQuery<Transcription>({
    queryKey: ["/api/transcribe", transcriptionId],
    enabled: !!transcriptionId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) {
        return 2000; // Poll every 2 seconds
      }
      
      // Keep polling while transcription is in progress
      if (data.status === "processing" || data.status === "pending") {
        return 2000;
      }
      
      // Keep polling while translation is in progress
      if (data.translationStatus === "processing") {
        return 2000;
      }
      
      // Keep polling while dubbing is in progress
      if (data.dubbingStatus === "processing") {
        return 2000;
      }
      
      return false; // Stop polling when transcription, translation, and dubbing are done
    },
  });

  const transcribeMutation = useMutation({
    mutationFn: async (data: TranscriptionRequest) => {
      return await apiRequest("POST", "/api/transcribe", data);
    },
    onSuccess: (data) => {
      setTranscriptionId(data.id);
      toast({
        title: t("transcription.toast.processingStarted"),
        description: t("transcription.toast.processingDescription"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("transcription.toast.transcriptionFailed"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const translateMutation = useMutation({
    mutationFn: async ({ id, targetLanguage }: { id: string; targetLanguage: string }) => {
      return await apiRequest("POST", `/api/transcribe/${id}/translate`, { targetLanguage });
    },
    onSuccess: () => {
      toast({
        title: t("transcription.toast.translationStarted"),
        description: t("transcription.toast.translationDescription"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transcribe", transcriptionId] });
    },
    onError: (error: Error) => {
      toast({
        title: t("transcription.toast.translationFailed"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const dubbingMutation = useMutation({
    mutationFn: async ({ id, targetLanguage }: { id: string; targetLanguage: string }) => {
      return await apiRequest("POST", `/api/transcribe/${id}/dub`, { targetLanguage });
    },
    onSuccess: () => {
      toast({
        title: t("transcription.dubbing.toast.dubbingStarted"),
        description: t("transcription.dubbing.toast.dubbingDescription"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transcribe", transcriptionId] });
    },
    onError: (error: Error) => {
      toast({
        title: t("transcription.dubbing.toast.dubbingFailed"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (transcriptionData?.status === "completed") {
      toast({
        title: t("transcription.toast.transcriptionCompleted"),
        description: t("transcription.toast.transcriptionCompletedDescription"),
      });
    } else if (transcriptionData?.status === "error") {
      toast({
        title: t("transcription.toast.transcriptionFailed"),
        description: transcriptionData.error || t("transcription.error.message"),
        variant: "destructive",
      });
    }
  }, [transcriptionData?.status, transcriptionData?.error, toast, t]);

  // Auto-download dubbed video when dubbing completes
  useEffect(() => {
    if (
      transcriptionData?.dubbingStatus === "completed" &&
      transcriptionData?.dubbedVideoUrl &&
      transcriptionData?.id &&
      !hasAutoDownloadedRef.current.has(transcriptionData.id)
    ) {
      const videoUrl = transcriptionData.dubbedVideoUrl;
      const videoId = transcriptionData.id;
      
      // Mark as downloaded to prevent duplicate downloads
      hasAutoDownloadedRef.current.add(videoId);
      
      // Automatically download the dubbed video
      const downloadVideo = async () => {
        try {
          const response = await fetch(videoUrl);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `dubbed_video_${videoId}.mp4`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          
          toast({
            title: t("transcription.dubbing.toast.downloadStarted"),
            description: t("transcription.dubbing.toast.downloadDescription"),
          });
        } catch (error) {
          console.error("Auto-download failed:", error);
          toast({
            title: t("transcription.dubbing.toast.autoDownloadFailed"),
            description: t("transcription.dubbing.toast.autoDownloadDescription"),
            variant: "destructive",
          });
        }
      };
      
      downloadVideo();
    }
  }, [transcriptionData?.dubbingStatus, transcriptionData?.dubbedVideoUrl, transcriptionData?.id, toast]);

  const onSubmit = (data: TranscriptionRequest) => {
    transcribeMutation.mutate(data);
  };

  const downloadAsText = () => {
    if (!transcriptionData?.transcription) return;
    const blob = new Blob([transcriptionData.transcription], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transcription.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAsSRT = () => {
    if (!transcriptionData?.transcription) return;
    const lines = transcriptionData.transcription.split("\n");
    let srt = "";
    lines.forEach((line, index) => {
      if (line.trim()) {
        srt += `${index + 1}\n`;
        srt += `00:00:${String(index * 3).padStart(2, "0")},000 --> 00:00:${String((index + 1) * 3).padStart(2, "0")},000\n`;
        srt += `${line}\n\n`;
      }
    });
    const blob = new Blob([srt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transcription.srt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const isProcessing = transcriptionData?.status === "processing" || transcriptionData?.status === "pending";
  const isCompleted = transcriptionData?.status === "completed";
  const hasTranscription = !!transcriptionData?.transcription;

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-6">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" data-testid="link-breadcrumb-home">{t("transcription.breadcrumb.home")}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage data-testid="text-breadcrumb-current">{t("transcription.breadcrumb.current")}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4" data-testid="text-page-title">
            {t("transcription.pageTitle")}
          </h1>
          <p className="text-muted-foreground leading-relaxed max-w-3xl" data-testid="text-page-description">
            {t("transcription.pageDescription")}
          </p>
        </div>

        <Card className="p-6 mb-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="label-url">{t("transcription.form.urlLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t("transcription.form.urlPlaceholder")}
                        data-testid="input-url"
                      />
                    </FormControl>
                    <FormMessage data-testid="error-url" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={transcribeMutation.isPending || isProcessing}
                data-testid="button-transcribe"
              >
                {(transcribeMutation.isPending || isProcessing) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {transcribeMutation.isPending || isProcessing ? t("transcription.form.transcribing") : t("transcription.form.transcribeButton")}
              </Button>
            </form>
          </Form>
        </Card>

        {isProcessing && (
          <Card className="p-6 mb-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" data-testid="text-processing-status">{t("transcription.processing.status")}</span>
                <span className="text-sm text-muted-foreground" data-testid="text-progress-percent">{transcriptionData.progress}%</span>
              </div>
              <Progress value={transcriptionData.progress} data-testid="progress-transcription" />
              <p className="text-xs text-muted-foreground" data-testid="text-processing-message">
                {t("transcription.processing.message")}
              </p>
            </div>
          </Card>
        )}

        {transcriptionData?.status === "error" && (
          <Card className="p-6 mb-6 border-destructive">
            <div className="flex items-start gap-3">
              <div className="h-5 w-5 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-destructive text-sm">!</span>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-destructive mb-1" data-testid="text-error-title">
                  {t("transcription.error.title")}
                </h3>
                <p className="text-sm text-muted-foreground" data-testid="text-error-message">
                  {transcriptionData?.error || t("transcription.error.message")}
                </p>
                <p className="text-xs text-muted-foreground mt-2" data-testid="text-error-tip">
                  {t("transcription.error.tip")}
                </p>
              </div>
            </div>
          </Card>
        )}

        {hasTranscription && (
          <>
            <Card className="p-6 mb-6">
              <h2 className="text-lg font-medium mb-4" data-testid="text-video-player-title">{t("transcription.videoPlayer.title")}</h2>
              {transcriptionData.url && (
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <iframe
                    src={getYouTubeEmbedUrl(transcriptionData.url)}
                    className="w-full h-full rounded-lg"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    data-testid="iframe-video-player"
                  />
                </div>
              )}
            </Card>

            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium" data-testid="text-original-title">{t("transcription.transcript.title")}</h2>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadAsText}
                      data-testid="button-download-txt"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {t("transcription.transcript.downloadTxt")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadAsSRT}
                      data-testid="button-download-srt"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      {t("transcription.transcript.downloadSrt")}
                    </Button>
                  </div>
                </div>
                <div className="bg-muted/30 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap leading-relaxed font-mono" data-testid="text-original-transcription">
                    {transcriptionData.transcription}
                  </pre>
                </div>
              </Card>

              <Card className="p-6">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium" data-testid="text-translation-title">
                      {t("transcription.translation.title")}
                    </h2>
                    <div className="flex items-center gap-2">
                      <div className="w-48">
                        <LanguageSelector
                          value={translationLanguage}
                          onValueChange={setTranslationLanguage}
                          disabled={translateMutation.isPending || transcriptionData.translationStatus === "processing"}
                          testId="select-translation-language"
                        />
                      </div>
                      <Button
                        onClick={() => translateMutation.mutate({ id: transcriptionData.id, targetLanguage: translationLanguage })}
                        disabled={translateMutation.isPending || transcriptionData.translationStatus === "processing"}
                        data-testid="button-translate"
                      >
                        {(translateMutation.isPending || transcriptionData.translationStatus === "processing") && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        <Languages className="mr-2 h-4 w-4" />
                        {transcriptionData.translationStatus === "processing" ? t("transcription.translation.translating") : t("transcription.translation.translateButton")}
                      </Button>
                    </div>
                  </div>
                </div>

                {transcriptionData.translationStatus === "idle" && (
                  <div className="bg-muted/30 rounded-lg p-4 max-h-96 flex items-center justify-center text-muted-foreground">
                    <p className="text-sm" data-testid="text-translation-empty">{t("transcription.translation.empty")}</p>
                  </div>
                )}

                {transcriptionData.translationStatus === "processing" && (
                  <div className="bg-muted/30 rounded-lg p-4 max-h-96">
                    <div className="flex flex-col items-center justify-center text-muted-foreground py-8">
                      <Loader2 className="h-8 w-8 animate-spin mb-4" />
                      <p className="text-sm" data-testid="text-translation-processing">{t("transcription.translation.processing")}</p>
                    </div>
                  </div>
                )}

                {transcriptionData.translationStatus === "completed" && transcriptionData.translatedTranscription && (
                  <div className="bg-muted/30 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap leading-relaxed" data-testid="text-translated-transcription">
                      {transcriptionData.translatedTranscription}
                    </pre>
                  </div>
                )}

                {transcriptionData.translationStatus === "error" && (
                  <div className="bg-destructive/10 rounded-lg p-4">
                    <p className="text-sm text-destructive" data-testid="text-translation-error">
                      {transcriptionData.translationError || t("transcription.translation.error")}
                    </p>
                  </div>
                )}

                {/* Dubbing Section */}
                {transcriptionData.translationStatus === "completed" && (
                  <div className="mt-6 pt-6 border-t">
                    <div className="mb-4">
                      <h3 className="text-base font-medium mb-2" data-testid="text-dubbing-title">
                        {t("transcription.dubbing.title")}
                      </h3>
                      <p className="text-sm text-muted-foreground" data-testid="text-dubbing-description">
                        {t("transcription.dubbing.description")} {translationLanguage.toUpperCase()}
                      </p>
                    </div>

                    {(!transcriptionData.dubbingStatus || transcriptionData.dubbingStatus === "idle") && (
                      <Button
                        onClick={() => dubbingMutation.mutate({ id: transcriptionData.id, targetLanguage: translationLanguage })}
                        disabled={dubbingMutation.isPending}
                        className="w-full"
                        data-testid="button-generate-dubbing"
                      >
                        {dubbingMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Video className="mr-2 h-4 w-4" />
                        {t("transcription.dubbing.generateButton")}
                      </Button>
                    )}

                    {transcriptionData.dubbingStatus === "processing" && (
                      <div className="bg-muted/30 rounded-lg p-4">
                        <div className="flex flex-col items-center justify-center text-muted-foreground py-4">
                          <Loader2 className="h-8 w-8 animate-spin mb-4" />
                          <p className="text-sm font-medium mb-1" data-testid="text-dubbing-processing">
                            {t("transcription.dubbing.processing")}
                          </p>
                          <p className="text-xs text-muted-foreground" data-testid="text-dubbing-processing-detail">
                            {t("transcription.dubbing.processingDetail")}
                          </p>
                        </div>
                      </div>
                    )}

                    {transcriptionData.dubbingStatus === "completed" && transcriptionData.dubbedAudioUrl && transcriptionData.dubbedVideoUrl && (
                      <div className="space-y-3">
                        <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
                          <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-2" data-testid="text-dubbing-success">
                            {t("transcription.dubbing.success")}
                          </p>
                          <p className="text-xs text-muted-foreground" data-testid="text-dubbing-success-detail">
                            {t("transcription.dubbing.successDetail")}
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <a
                            href={transcriptionData.dubbedAudioUrl}
                            download
                            className="inline-flex"
                            data-testid="link-download-audio"
                          >
                            <Button variant="outline" className="w-full">
                              <Music className="mr-2 h-4 w-4" />
                              {t("transcription.dubbing.downloadAudio")}
                            </Button>
                          </a>
                          <a
                            href={transcriptionData.dubbedVideoUrl}
                            download
                            className="inline-flex"
                            data-testid="link-download-video"
                          >
                            <Button className="w-full">
                              <Video className="mr-2 h-4 w-4" />
                              {t("transcription.dubbing.downloadVideo")}
                            </Button>
                          </a>
                        </div>
                      </div>
                    )}

                    {transcriptionData.dubbingStatus === "error" && (
                      <div className="bg-destructive/10 rounded-lg p-4 border border-destructive/20">
                        <p className="text-sm font-medium text-destructive mb-2" data-testid="text-dubbing-error-title">
                          {t("transcription.dubbing.errorTitle")}
                        </p>
                        <p className="text-sm text-muted-foreground" data-testid="text-dubbing-error">
                          {transcriptionData.dubbingError || t("transcription.error.message")}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => dubbingMutation.mutate({ id: transcriptionData.id, targetLanguage: translationLanguage })}
                          disabled={dubbingMutation.isPending}
                          className="mt-3"
                          data-testid="button-retry-dubbing"
                        >
                          <Loader2 className={`mr-2 h-3 w-3 ${dubbingMutation.isPending ? 'animate-spin' : ''}`} />
                          {t("transcription.dubbing.retryButton")}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          </>
        )}

        {!hasTranscription && !isProcessing && (
          <Card className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2" data-testid="text-empty-title">{t("transcription.empty.title")}</h3>
              <p className="text-muted-foreground" data-testid="text-empty-description">
                {t("transcription.empty.description")}
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
