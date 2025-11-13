import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Download, Loader2, FileText, CheckCircle2 } from "lucide-react";
import { pdfTranslationRequestSchema, type PdfTranslationRequest, type PdfTranslation } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/contexts/TranslationContext";
import { formatDistanceToNow } from "date-fns";

export default function PdfTranslation() {
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [translationId, setTranslationId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<PdfTranslationRequest>({
    resolver: zodResolver(pdfTranslationRequestSchema),
    defaultValues: {
      sourceLanguage: "auto",
      targetLanguage: "es",
    },
  });

  // Fetch user translation history
  const { data: translationHistory } = useQuery<PdfTranslation[]>({
    queryKey: ["/api/document-translations"],
    enabled: !!user,
  });

  // Poll for current translation status
  const { data: translationData } = useQuery<PdfTranslation>({
    queryKey: ["/api/translate-pdf", translationId],
    enabled: !!translationId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data || data.status === "processing" || data.status === "pending") {
        return 2000;
      }
      return false;
    },
  });

  const translationMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return await apiRequest("POST", "/api/translate-pdf", formData);
    },
    onSuccess: (data) => {
      setTranslationId(data.id);
      toast({
        title: t("pdf.toast.processingStarted"),
        description: t("pdf.toast.processingDescription"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/document-translations"] });
    },
    onError: (error: Error) => {
      toast({
        title: t("pdf.toast.translationFailed"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (translationData?.status === "completed") {
      toast({
        title: t("pdf.toast.translationCompleted"),
        description: t("pdf.toast.translationCompletedDescription"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/document-translations"] });
    } else if (translationData?.status === "error") {
      toast({
        title: t("pdf.toast.translationFailed"),
        description: translationData.error || t("pdf.toast.translationFailed"),
        variant: "destructive",
      });
    }
  }, [translationData?.status, translationData?.error, toast, t]);

  const onSubmit = (data: PdfTranslationRequest) => {
    if (!selectedFile) {
      toast({
        title: t("pdf.toast.noFileSelected"),
        description: t("pdf.toast.noFileDescription"),
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("pdf", selectedFile);
    formData.append("sourceLanguage", data.sourceLanguage);
    formData.append("targetLanguage", data.targetLanguage);

    translationMutation.mutate(formData);
  };

  const isValidDocumentType = (file: File) => {
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    const validExtensions = [".pdf", ".docx"];
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    
    return validTypes.includes(file.type) || validExtensions.includes(fileExtension);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isValidDocumentType(file)) {
      setSelectedFile(file);
    } else {
      toast({
        title: t("pdf.toast.invalidFile"),
        description: t("pdf.toast.invalidFileDescription"),
        variant: "destructive",
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && isValidDocumentType(file)) {
      setSelectedFile(file);
    } else {
      toast({
        title: t("pdf.toast.invalidFile"),
        description: t("pdf.toast.invalidFileDescription"),
        variant: "destructive",
      });
    }
  };

  const getLanguageName = (code: string) => {
    return t(`languages.${code}`) || code;
  };

  const inProgressTranslations = translationHistory?.filter(t => 
    t.status === "processing" || t.status === "pending"
  ) || [];

  const completedTranslations = translationHistory?.filter(t => 
    t.status === "completed"
  ) || [];

  return (
    <div className="flex h-screen pt-16 bg-background">
      {/* Left Column - Upload & Translate */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-xl">
          <h1 className="text-3xl font-bold mb-8" data-testid="text-page-title">
            {t("pdf.pageTitle")}
          </h1>

          {/* Upload Area */}
          <Card className="p-8 mb-6">
            <div
              className="border-2 border-dashed rounded-lg p-16 text-center cursor-pointer hover-elevate transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              data-testid="dropzone-pdf"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-base font-medium mb-1" data-testid="text-file-name">
                    {selectedFile ? selectedFile.name : t("pdf.upload.dragDrop")}
                  </p>
                  <p className="text-sm text-muted-foreground" data-testid="text-file-info">
                    {t("pdf.upload.supportedFormats")}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  data-testid="button-browse-files"
                >
                  {t("pdf.upload.browseFiles")}
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                className="hidden"
                data-testid="input-pdf-file"
              />
            </div>
          </Card>

          {/* Language Selection */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sourceLanguage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-source-language">{t("pdf.form.sourceLanguageLabel")}</FormLabel>
                      <FormControl>
                        <LanguageSelector
                          value={field.value}
                          onValueChange={field.onChange}
                          testId="select-source-language"
                        />
                      </FormControl>
                      <FormMessage data-testid="error-source-language" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="targetLanguage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-target-language">{t("pdf.form.targetLanguageLabel")}</FormLabel>
                      <FormControl>
                        <LanguageSelector
                          value={field.value}
                          onValueChange={field.onChange}
                          testId="select-target-language"
                        />
                      </FormControl>
                      <FormMessage data-testid="error-target-language" />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={!selectedFile || translationMutation.isPending}
                data-testid="button-translate-pdf"
              >
                {translationMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("pdf.form.translateButton")}
              </Button>
            </form>
          </Form>
        </div>
      </div>

      {/* Right Column - Translation Status & History */}
      <div className="w-[500px] border-l bg-muted/30 flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold" data-testid="text-history-title">
            {t("pdf.history.title")}
          </h2>
        </div>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {/* IN PROGRESS Section */}
            {inProgressTranslations.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                  {t("pdf.history.inProgress")}
                </h3>
                <div className="space-y-3">
                  {inProgressTranslations.map((trans) => (
                    <Card key={trans.id} className="p-4" data-testid={`progress-${trans.id}`}>
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium truncate flex-1">{trans.fileName}</p>
                          <span className="text-xs text-orange-500 whitespace-nowrap">
                            {t("pdf.history.translating")} ({getLanguageName(trans.targetLanguage)})...
                          </span>
                        </div>
                        <Progress 
                          value={trans.progress || 0} 
                          className="h-2" 
                          data-testid={`progress-bar-${trans.id}`}
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* COMPLETED Section */}
            {completedTranslations.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                  {t("pdf.history.completed")}
                </h3>
                <div className="space-y-3">
                  {completedTranslations.map((trans) => (
                    <Card key={trans.id} className="p-4" data-testid={`completed-${trans.id}`}>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate mb-1">{trans.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {t("pdf.history.translatedTo")} {getLanguageName(trans.targetLanguage)} • {formatDistanceToNow(new Date(trans.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        {trans.translatedFileUrl && (
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white flex-shrink-0"
                            asChild
                            data-testid={`button-download-${trans.id}`}
                          >
                            <a href={trans.translatedFileUrl} download>
                              <Download className="h-3 w-3 mr-1" />
                              {t("pdf.history.download")}
                            </a>
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {inProgressTranslations.length === 0 && completedTranslations.length === 0 && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">{t("pdf.history.empty.title")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("pdf.history.empty.description")}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
