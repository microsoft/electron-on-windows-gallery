
const { contextBridge, ipcRenderer, webUtils } = require('electron');

const myAddon = require('./myAddon');
const {LanguageModel, AIFeatureReadyState, LanguageModelOptions, LanguageModelResponseResult, LanguageModelResponseStatus, ImageDescriptionGenerator, ImageDescriptionKind, TextRecognizer, ContentFilterOptions, TextSummarizer, ConversationItem, TextRewriter, TextRewriteTone, TextToTableConverter, LimitedAccessFeatures, LimitedAccessFeatureStatus} = require('@microsoft/winapp-windows-ai');

contextBridge.exposeInMainWorld('winAppSdk', {
  showNotification: (title, body) => {
    myAddon.showNotification(title, body);
  },
  showBadgeNotification: (showBadge) => {
    myAddon.showBadgeNotification(showBadge);
  },
  copyToClipboard: (text) => {
    myAddon.copyToClipboard(text);
  },
  openNewFile: () => {
    return myAddon.openNewFile();
  }
  
});

contextBridge.exposeInMainWorld('electronUtils', {
  getAppPath: () => {
    return ipcRenderer.invoke('get-app-path');
  },
  getOcrImagePath: () => {
    return ipcRenderer.invoke('get-ocr-image-path');
  },
  getImgDescriptionImagePath: () => {
    return ipcRenderer.invoke('get-img-description-image-path');
  },
  onWindowFocusChanged: (callback) => {
    ipcRenderer.on('window-focus-changed', (event, isFocused) => callback(isFocused));
  },
  getPathForFile: (file) => {
    return webUtils.getPathForFile(file);
  }
});

contextBridge.exposeInMainWorld('externalWindowsAI', {
  generateText: async (prompt, progressCallback) => {
    const access = LimitedAccessFeatures.TryUnlockFeature(
   "com.microsoft.windows.ai.languagemodel",
   "s1+oNYK6yD1vHgZ1GJLZbQ==",
   "ph1m9x8skttmg has registered their use of com.microsoft.windows.ai.languagemodel with Microsoft and agrees to the terms of use.");
    console.log(access);
    if ((access.Status == LimitedAccessFeatureStatus.Available) ||
      (access.Status == LimitedAccessFeatureStatus.AvailableWithoutToken))
    {
      var languageModel = await LanguageModel.CreateAsync();
      if (languageModel){
        var options = new LanguageModelOptions();
        options.temperature = 0.9;
        options.topK = 15;
        options.topP = 0.8;
        var progressResult = languageModel.GenerateResponseAsync(prompt, options);
        progressResult.progress((sender, progress) => {
          progressCallback(progress);
        });
        var result = await progressResult;
        return result.Text;
      }else{
        return "Language Model is not ready. Please check that your device meets the requirements to use Phi Silica :(.";
      }
    }else {
      return "You need an access token to use this Language Model feature.";
    }
      
  },
  generateCaption: async (imagePath, progressCallback, descriptionKind = 'BriefDescription') => {
    try {
      const generator = await ImageDescriptionGenerator.CreateAsync();
      var contentFilterOptions = new ContentFilterOptions();
      
      // Map string values to ImageDescriptionKind enum values
      let kindEnum;
      switch (descriptionKind) {
        case 'Detailed':
          kindEnum = ImageDescriptionKind.DetailedDescription;
          break;
        case 'Diagram':
          kindEnum = ImageDescriptionKind.DiagramDescription;
          break;
        case 'Accessible':
          kindEnum = ImageDescriptionKind.AccessibleDescription;
          break;
        case 'Brief':
        default:
          kindEnum = ImageDescriptionKind.BriefDescription;
          break;
      }
      
      const progressResult = generator.DescribeAsync(imagePath, kindEnum, contentFilterOptions);
      progressResult.progress((sender, progress) => {
        progressCallback(progress);
      });
      var result = await progressResult;
      generator.Close();
      return result.Description;
    } catch (error) {
        console.error('Error generating image description:', error);
        return null;
    }
  },
  recognizeText: async (imagePath) => {
    let recognizer = null;
    
    try {
        recognizer = await TextRecognizer.CreateAsync();
        const readyState = TextRecognizer.GetReadyState();
      
        if (readyState !== AIFeatureReadyState.Ready) {
            console.log('Ensuring TextRecognizer is ready...');
            await TextRecognizer.EnsureReadyAsync();
        }

        const recognizedText = await recognizer.RecognizeTextFromImageAsync(imagePath);
        const lines = recognizedText.Lines;

        const resultArray = [];
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const text = line.Text;
          const boundingBox = line.BoundingBox;

          const simplifiedBoundingBox = [boundingBox.TopLeft.X, boundingBox.TopLeft.Y];
          
          resultArray.push({
            text: text,
            boundingBox: simplifiedBoundingBox
          });
        }
        
        return resultArray;
    } catch (error) {
        console.error('Error during text recognition:', error);
        throw error;
    } finally {
        if (recognizer) {
            try {
                recognizer.Close();
            } catch (cleanupError) {
                console.error('Error during cleanup:', cleanupError);
            }
        }
    }
  },
  summarize: async (textToSummarize, progressCallback) => {
    try {
      console.log("summarize running");
        const languageModel = await LanguageModel.CreateAsync();
        const textSummarizer = new TextSummarizer(languageModel);
        
        const progressResult = textSummarizer.SummarizeAsync(textToSummarize);
        
        progressResult.progress((sender, progress) => {
          progressCallback(progress);
        });

        const result = await progressResult;

        return result.Text;

    } catch (error) {
        console.error('Error summarizing text:', error);
    }
  },
  summarizeParagraph: async (textToSummarize, progressCallback) => {
    try {
        console.log("summarizeParagraph running");
        const languageModel = await LanguageModel.CreateAsync();
        const textSummarizer = new TextSummarizer(languageModel);
        
        const progressResult = textSummarizer.SummarizeParagraphAsync(textToSummarize);
        
        progressResult.progress((sender, progress) => {
          progressCallback(progress);
        });

        const result = await progressResult;

        return result.Text;

    } catch (error) {
        console.error('Error summarizing text:', error);
    }
  },
  summarizeConversation: async (textToSummarize, progressCallback) => {
    try {
        console.log("summarizeConversation running");
        const languageModel = await LanguageModel.CreateAsync();
        const textSummarizer = new TextSummarizer(languageModel);

        const conversation = [
            new ConversationItem(),
            new ConversationItem(),
            new ConversationItem()
        ];

        conversation[0].Message = "Hello, I need help with my computer";
        conversation[0].Participant = "User";
        
        conversation[1].Message = "I'd be happy to help! What seems to be the problem?";
        conversation[1].Participant = "Support";
        
        conversation[2].Message = "My computer keeps freezing when I try to open large files";
        conversation[2].Participant = "User";
        
        // Conversation summary options
        const options = {
            includeMessageCitations: true,
            includeParticipantAttribution: true
        };

        const promptCheck = textSummarizer.IsPromptLargerThanContext(conversation, options);

        if (promptCheck.isLarger){
          return "Prompt is too long. Please shorten.";
        }
        
        const progressResult = textSummarizer.SummarizeConversationAsync(conversation, options);
        
        progressResult.progress((sender, progress) => {
          progressCallback(progress);
        });

        const result = await progressResult;

        return result.Text;

    } catch (error) {
        console.error('Error summarizing text:', error);
    }
  },
  rewriteText: async (textToRewrite, tone, progressCallback) => {
    try {
      const languageModel = await LanguageModel.CreateAsync();
      const textRewriter = new TextRewriter(languageModel);
      console.log(tone);
      console.log(textToRewrite);

      // Map string values to TextRewriteTone enum values
      let toneEnum;
      switch (tone) {
        case 'General':
          toneEnum = TextRewriteTone.General;
          break;
        case 'Casual':
          toneEnum = TextRewriteTone.Casual;
          break;
        case 'Formal':
          toneEnum = TextRewriteTone.Formal;
          break;
        case 'Default':
        default:
          toneEnum = TextRewriteTone.Default;
          break;
      }

      const progressResult = textRewriter.RewriteAsync(textToRewrite, toneEnum);
      progressResult.progress((sender, progress) => {
          progressCallback(progress);
        });
      const result = await progressResult;
      return result.Text;
    } catch (error) {
      console.error('Error rewriting text:', error);
    }
  },
  convertToTable: async (textToConvert, progressCallback) => {
    try {
    const model = await LanguageModel.CreateAsync();
    const tableConverter = new TextToTableConverter(model);

    // Convert text to table format
    const tableData = await tableConverter.ConvertAsync(textToConvert);

    const rows = tableData.GetRows();
    var result = [];
    rows.forEach((row, rowIndex) => {
      const columns = row.GetColumns();
      result.push(columns);
    });
    
    return result;

  } catch (error) {
    console.error("Error:", error);
  }
}
});