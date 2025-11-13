import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Send, Plus, MessageSquare, Bot, User, Languages, Loader2, Briefcase } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/contexts/TranslationContext";
import type { ChatMessage, Conversation } from "@shared/schema";

export default function MultilingualChat() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("en");
  const [conversationId, setConversationId] = useState<string>("");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch user conversations
  const { data: conversations } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    enabled: !!user,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: async (data: { message: string; language: string; conversationId?: string }) => {
      return await apiRequest("POST", "/api/chat", data);
    },
    onSuccess: (data: any) => {
      if (data && Array.isArray(data.messages)) {
        setMessages(data.messages);
        setConversationId(data.conversationId);
        setSelectedConversationId(data.conversationId);
        setInput("");
        queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      }
    },
    onError: (error: Error) => {
      setMessages((prev) => prev.slice(0, -1));
      toast({
        title: t("chat.toast.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      language,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    chatMutation.mutate({
      message: input,
      language,
      conversationId: conversationId || undefined,
    });
  };

  const handleNewChat = () => {
    setMessages([]);
    setConversationId("");
    setSelectedConversationId(null);
    setInput("");
  };

  const handleSelectConversation = (conv: Conversation) => {
    setMessages(conv.messages);
    setConversationId(conv.id);
    setSelectedConversationId(conv.id);
    setLanguage(conv.primaryLanguage);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen pt-16">
      {/* Sidebar - Conversations List */}
      <div className="w-80 border-r flex flex-col bg-muted/30">
        <div className="p-4 border-b">
          <Button
            onClick={handleNewChat}
            className="w-full gap-2"
            data-testid="button-new-chat"
          >
            <Plus className="h-4 w-4" />
            {t("chat.sidebar.newChat")}
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {conversations && conversations.length > 0 ? (
              conversations.map((conv) => (
                <Card
                  key={conv.id}
                  className={`p-3 cursor-pointer hover-elevate active-elevate-2 transition-colors ${
                    selectedConversationId === conv.id ? "bg-accent" : ""
                  }`}
                  onClick={() => handleSelectConversation(conv)}
                  data-testid={`conversation-${conv.id}`}
                >
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {conv.messages[0]?.content || t("chat.sidebar.newChat")}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {conv.primaryLanguage.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {conv.messages.length} {t("chat.sidebar.messages")}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t("chat.sidebar.noConversations")}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="border-b p-4 flex items-center justify-between bg-card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Languages className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold" data-testid="text-chat-title">
                {selectedConversationId ? t("chat.header.activeConversation") : t("chat.header.newConversation")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t("chat.header.subtitle")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t("chat.header.language")}</span>
            <div className="w-40">
              <LanguageSelector
                value={language}
                onValueChange={setLanguage}
                testId="select-chat-language"
              />
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-6">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2" data-testid="text-empty-title">
                  {t("chat.empty.title")}
                </h3>
                <p className="text-muted-foreground" data-testid="text-empty-description">
                  {t("chat.empty.description")}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-4xl mx-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  data-testid={`message-${message.role}`}
                >
                  {message.role === "assistant" && (
                    <div className="h-10 w-10 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center flex-shrink-0">
                      <Briefcase className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] rounded-xl p-4 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                    {message.translatedContent && (
                      <p className="text-xs mt-2 pt-2 border-t border-current/20 opacity-70">
                        {t("chat.messages.original")} {message.translatedContent}
                      </p>
                    )}
                  </div>
                  {message.role === "user" && (
                    <div className="h-10 w-10 rounded-full bg-card border-2 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5" />
                    </div>
                  )}
                </div>
              ))}
              {chatMutation.isPending && (
                <div className="flex gap-3 justify-start">
                  <div className="h-10 w-10 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <div className="bg-muted rounded-xl p-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t p-4 bg-card">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("chat.input.placeholder")}
                className="resize-none min-h-[60px] max-h-[200px]"
                data-testid="input-chat-message"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || chatMutation.isPending}
                size="icon"
                className="h-[60px] w-[60px]"
                data-testid="button-send-message"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2" data-testid="text-keyboard-hint">
              {t("chat.input.keyboardHint")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
