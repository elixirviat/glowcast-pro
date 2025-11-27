return (
    <div className="flex h-screen items-center justify-center font-sans dark:bg-black">
      <main className="w-full dark:bg-black h-screen relative">
        {/* Header */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-linear-to-b from-background via-background/50 to-transparent dark:bg-black overflow-visible pb-4">
          <div className="relative overflow-visible">
            <ChatHeader>
              <ChatHeaderBlock />
              <ChatHeaderBlock className="justify-center items-center">
                <Avatar className="size-8 ring-1 ring-primary">
                  <AvatarImage src="https://i.ibb.co/ccdTwRh4/GlowCast.png" />
                  <AvatarFallback>GC</AvatarFallback>
                </Avatar>
                <p className="tracking-tight">Chat with {AI_NAME}</p>
              </ChatHeaderBlock>
              <ChatHeaderBlock className="justify-end">
                <Button variant="outline" size="sm" className="cursor-pointer" onClick={clearChat}>
                  <Plus className="size-4" />
                  {CLEAR_CHAT_TEXT}
                </Button>
              </ChatHeaderBlock>
            </ChatHeader>
          </div>
        </div>

        {/* Chat Area */}
        <div className="h-screen overflow-y-auto px-5 py-4 w-full pt-[88px] pb-64">
          <div className="flex flex-col items-center justify-end min-h-full">
            {isClient ? (
              <>
                <MessageWall messages={messages} status={status} durations={durations} onDurationChange={handleDurationChange} />
                {status === "submitted" && (
                  <div className="flex justify-start max-w-3xl w-full mt-4">
                    <div className="flex gap-3">
                        <Avatar className="size-8 ring-1 ring-primary">
                            <AvatarImage src="https://i.ibb.co/ccdTwRh4/GlowCast.png" />
                        </Avatar>
                        <div className="flex items-center">
                            <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-center max-w-2xl w-full">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        {/* Footer Input Area */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-linear-to-t from-background via-background/50 to-transparent dark:bg-black overflow-visible pt-4 pb-6">
          <div className="w-full px-5 items-center flex flex-col justify-center relative overflow-visible">
            <div className="message-fade-overlay" />
            
            <div className="max-w-3xl w-full space-y-3 bg-background/80 backdrop-blur-md p-4 rounded-xl border border-border shadow-lg">
              
              {/* 1. LOCATION CHIPS */}
              {showLocations && (
                <div className="flex gap-2 overflow-x-auto pb-2 w-full no-scrollbar justify-start sm:justify-center">
                  {LOCATION_SUGGESTIONS.map((action, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="rounded-full bg-background hover:bg-primary/20 border-primary/30 text-xs sm:text-sm whitespace-nowrap px-4 h-9"
                      onClick={() => handleSuggestionClick(action.text)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}

              {/* 2. NEW: CATEGORY TILES (Skincare/Makeup/Both) */}
              {showCategoryButtons && (
                <div className="flex gap-4 justify-center w-full pb-2">
                  {CATEGORY_CHIPS.map((cat, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      // TILE STYLING: Large square, flex-col to stack emoji/text, scale animation
                      className="flex flex-col gap-2 h-24 w-24 rounded-xl border-2 border-muted-foreground/20 hover:border-primary hover:bg-primary/5 hover:scale-105 transition-all shadow-sm"
                      onClick={() => handleSuggestionClick(cat.text)}
                    >
                      {/* Split emoji and text for better layout */}
                      <span className="text-2xl">{cat.label.split(" ")[1]}</span>
                      <span className="font-semibold text-xs uppercase tracking-wide">
                        {cat.label.split(" ")[0]}
                      </span>
                    </Button>
                  ))}
                </div>
              )}

              {/* 3. INVENTORY CHIPS */}
              {activeChips.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-start sm:justify-center max-h-[100px] overflow-y-auto">
                  {activeChips.map((item, index) => (
                    <Button
                      key={index}
                      variant="secondary"
                      size="sm"
                      className="rounded-full text-xs bg-primary/10 hover:bg-primary/30 border border-primary/20"
                      onClick={() => handleInventoryClick(item)}
                    >
                      + {item}
                    </Button>
                  ))}
                </div>
              )}

              <form id="chat-form" onSubmit={form.handleSubmit(onSubmit)}>
                <FieldGroup>
                  <Controller
                    name="message"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="chat-form-message" className="sr-only">Message</FieldLabel>
                        <div className="relative">
                          <textarea
                            {...field}
                            id="chat-form-message"
                            className="w-full min-h-[50px] max-h-[200px] p-3 pr-14 rounded-[15px] bg-muted border border-input focus:outline-none focus:ring-2 focus:ring-ring resize-none text-sm"
                            placeholder={activeChips.length > 0 ? "Tap items above or type..." : "Type your message..."}
                            disabled={status === "streaming"}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                form.handleSubmit(onSubmit)();
                              }
                            }}
                          />
                          <Button
                            className="absolute right-2 bottom-2 rounded-full w-8 h-8"
                            type="submit"
                            disabled={!field.value.trim() || status === "streaming"}
                            size="icon"
                          >
                            {status === "streaming" ? <Square className="size-3" onClick={stop}/> : <ArrowUp className="size-4" />}
                          </Button>
                        </div>
                      </Field>
                    )}
                  />
                </FieldGroup>
              </form>
              
              <div className="w-full flex justify-center text-[10px] text-muted-foreground text-center">
                GlowCast Pro can make mistakes, so please double-check it.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div >
  );
