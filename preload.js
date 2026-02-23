
const { contextBridge, ipcRenderer, webUtils } = require('electron');
const path = require('path');

// Global error handlers for preload context
process.on('uncaughtException', (error) => {
  console.error('Preload uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Preload unhandled rejection:', reason);
});

// Load environment variables from .env file in development
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not available in production, that's fine
}

// Get LAF token - from env in dev, or placeholder gets replaced in CI build
const LAF_TOKEN = process.env.LAF_TOKEN || '__LAF_TOKEN__';

// Load environment variables from .env file in development
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not available in production, that's fine
}

// Get LAF token - from env in dev, or placeholder gets replaced in CI build
const LAF_TOKEN = process.env.LAF_TOKEN || '__LAF_TOKEN__';

const myAddon = require('./myAddon');
const {LanguageModel, AIFeatureReadyState, AIFeatureReadyResultState, LanguageModelOptions, LanguageModelResponseResult, LanguageModelResponseStatus, ImageDescriptionGenerator, ImageDescriptionKind, TextRecognizer, ContentFilterOptions, TextSummarizer, ConversationItem, TextRewriter, TextRewriteTone, TextToTableConverter, LimitedAccessFeatures, LimitedAccessFeatureStatus} = require('@microsoft/winapp-windows-ai');

contextBridge.exposeInMainWorld('winSdk', {
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
    return ipcRenderer.invoke('open-file-dialog');
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
  // Check readiness state directly each time
  isLanguageModelReady: () => {
    try {
      const state = LanguageModel.GetReadyState();
      return state === AIFeatureReadyState.Ready;
    } catch (error) {
      console.error('Error checking LanguageModel state:', error);
      return false;
    }
  },
  isImageDescriptionReady: () => {
    try {
      const state = ImageDescriptionGenerator.GetReadyState();
      return state === AIFeatureReadyState.Ready;
    } catch (error) {
      console.error('Error checking ImageDescriptionGenerator state:', error);
      return false;
    }
  },
  isTextRecognizerReady: () => {
    try {
      const state = TextRecognizer.GetReadyState();
      return state === AIFeatureReadyState.Ready;
    } catch (error) {
      console.error('Error checking TextRecognizer state:', error);
      return false;
    }
  },

  generateText: async (prompt, progressCallback) => {
    let languageModel = null;
    try {
      const access = LimitedAccessFeatures.TryUnlockFeature(
     "com.microsoft.windows.ai.languagemodel",
     LAF_TOKEN,
     "8wekyb3d8bbwe has registered their use of com.microsoft.windows.ai.languagemodel with Microsoft and agrees to the terms of use.");
      console.log(access);
      if ((access.Status == LimitedAccessFeatureStatus.Available) ||
        (access.Status == LimitedAccessFeatureStatus.AvailableWithoutToken))
      {
        languageModel = await LanguageModel.CreateAsync();
        if (languageModel){
          var options = new LanguageModelOptions();
          options.temperature = 0.9;
          options.topK = 15;
          options.topP = 0.8;
          var progressResult = languageModel.GenerateResponseAsync(prompt, options);
          
          progressResult.progress((sender, progress) => {
            try {
              progressCallback(progress);
            } catch (e) {
              // Callback context may be destroyed if page navigated away
              console.log('Progress callback context destroyed');
            }
          });
          var result = await progressResult;
          return result.Text;
        }else{
          return "Language Model is not ready. Please check that your device meets the requirements to use Phi Silica.";
        }
      }else {
        return "You need an access token to use this Language Model feature.";
      }
    } catch (error) {
      console.error('Error generating text:', error);
      return "Error generating text. Please try again.";
    }
  },
  generateCaption: async (imagePath, progressCallback, descriptionKind = 'BriefDescription') => {
    let generator = null;
    try {
      generator = await ImageDescriptionGenerator.CreateAsync();
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
      
      // Track if we're still processing to avoid callback issues after close
      let isProcessing = true;
      
      progressResult.progress((sender, progress) => {
        if (!isProcessing) return; // Don't process callbacks after we're done
        try {
            progressCallback(progress);
        } catch (e) {
          // Callback context may be destroyed if page navigated away
          console.log('Progress callback context destroyed');
        }
      });
      var result = await progressResult;
      console.log("generateCaption result:", result);
      const description = result?.Description || null;
      isProcessing = false;
      
      // Small delay to allow any pending progress callbacks to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      try {
        generator.Close();
      } catch (e) {
        // Ignore close errors
      }
      return description;
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

        const recognizeOperation = recognizer.RecognizeTextFromImageAsync(imagePath);
        
        const recognizedText = await recognizeOperation;
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
    let languageModel = null;
    try {
      console.log("summarize running");
        languageModel = await LanguageModel.CreateAsync();
        const textSummarizer = new TextSummarizer(languageModel);
        
        const progressResult = textSummarizer.SummarizeAsync(textToSummarize);
        
        progressResult.progress((sender, progress) => {
          try {
            progressCallback(progress);
          } catch (e) {
            // Callback context may be destroyed if page navigated away
            console.log('Progress callback context destroyed');
          }
        });

        const result = await progressResult;

        return result.Text;

    } catch (error) {
        console.error('Error summarizing text:', error);
        return "Error summarizing text. Please try again.";
    }
  },
  summarizeParagraph: async (textToSummarize, progressCallback) => {
    let languageModel = null;
    try {
        console.log("summarizeParagraph running");
        languageModel = await LanguageModel.CreateAsync();
        const textSummarizer = new TextSummarizer(languageModel);
        
        const progressResult = textSummarizer.SummarizeParagraphAsync(textToSummarize);
        
        progressResult.progress((sender, progress) => {
          try {
            progressCallback(progress);
          } catch (e) {
            // Callback context may be destroyed if page navigated away
            console.log('Progress callback context destroyed');
          }
        });

        const result = await progressResult;

        return result.Text;

    } catch (error) {
        console.error('Error summarizing text:', error);
        return "Error summarizing paragraph. Please try again.";
    }
  },
  summarizeConversation: async (textToSummarize, progressCallback) => {
    let languageModel = null;
    try {
        console.log("summarizeConversation running");
        languageModel = await LanguageModel.CreateAsync();
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
          try {
            progressCallback(progress);
          } catch (e) {
            // Callback context may be destroyed if page navigated away
            console.log('Progress callback context destroyed');
          }
        });

        const result = await progressResult;

        return result.Text;

    } catch (error) {
        console.error('Error summarizing conversation:', error);
        return "Error summarizing conversation. Please try again.";
    }
  },
  rewriteText: async (textToRewrite, tone, progressCallback) => {
    let languageModel = null;
    try {
      languageModel = await LanguageModel.CreateAsync();
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
        try {
          progressCallback(progress);
        } catch (e) {
          // Callback context may be destroyed if page navigated away
          console.log('Progress callback context destroyed');
        }
      });
      const result = await progressResult;
      return result.Text;
    } catch (error) {
      console.error('Error rewriting text:', error);
      return "Error rewriting text. Please try again.";
    }
  },
  convertToTable: async (textToConvert, progressCallback) => {
    let model = null;
    try {
      model = await LanguageModel.CreateAsync();
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
      console.error("Error converting to table:", error);
      return null;
    }
  }
});

// MCP API exposure
contextBridge.exposeInMainWorld('mcpAPI', {
  fetchServers: () => ipcRenderer.invoke('mcp:fetchServers'),
  connectToServer: (server) => ipcRenderer.invoke('mcp:connectToServer', server),
  listTools: () => ipcRenderer.invoke('mcp:listTools'),
  callTool: (toolName, parameters) => ipcRenderer.invoke('mcp:callTool', toolName, parameters),
  disconnect: () => ipcRenderer.invoke('mcp:disconnect'),
  isConnected: () => ipcRenderer.invoke('mcp:isConnected')
});