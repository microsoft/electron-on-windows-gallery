#include <napi.h>
#include <shobjidl_core.h>
#include <windows.h>

#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.Storage.h>
#include <winrt/Windows.Storage.Streams.h>
#include <winrt/Microsoft.Windows.AI.Imaging.h>
#include <winrt/Windows.Graphics.Imaging.h>
#include <winrt/Microsoft.Graphics.Imaging.h>
#include <winrt/Microsoft.Windows.AI.ContentSafety.h>
#include <winrt/Windows.Data.Xml.Dom.h>

using namespace winrt;
using namespace Windows::Storage;
using namespace Windows::Storage::Streams;
using namespace Windows::Graphics::Imaging;
using namespace Microsoft::Windows::AI;
using namespace Microsoft::Windows::AI::Imaging;
using namespace Microsoft::Graphics::Imaging;
using namespace Microsoft::Windows::AI::ContentSafety;
using namespace Windows::Data::Xml::Dom;


Napi::Value RunTextRecognition(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    std::string filePath = info[0].As<Napi::String>();
    try {
        auto file = StorageFile::GetFileFromPathAsync(winrt::to_hstring(filePath)).get();
        auto stream = file.OpenAsync(FileAccessMode::Read).get();
        auto decoder = BitmapDecoder::CreateAsync(stream).get();
        auto bitmap = decoder.GetSoftwareBitmapAsync().get();

        auto readyState = TextRecognizer::GetReadyState();
        if (readyState == AIFeatureReadyState::NotReady){
            TextRecognizer::EnsureReadyAsync().get();
        }

        auto textRecognizer = TextRecognizer::CreateAsync().get();
        auto imageBuffer = ImageBuffer::CreateForSoftwareBitmap(bitmap);

        Napi::Array results = Napi::Array::New(env);
        uint32_t idx = 0;

        if (textRecognizer){
            auto recognizedText = textRecognizer.RecognizeTextFromImage(imageBuffer);
            for (const auto& line : recognizedText.Lines())
            {
                auto text = winrt::to_string(line.Text());
                auto boundingBox = line.BoundingBox();

                Napi::Object entry = Napi::Object::New(env);
                entry.Set("text", Napi::String::New(env, text));

                Napi::Array box = Napi::Array::New(env, 2);
                box.Set((uint32_t)0, Napi::Number::New(env, boundingBox.TopLeft.X));
                box.Set((uint32_t)1, Napi::Number::New(env, boundingBox.TopLeft.Y));
                entry.Set("boundingBox", box);

                results.Set(idx++, entry);
            }
        }

        return results;
    } catch (const winrt::hresult_error& ex) {
        Napi::Error::New(env, winrt::to_string(ex.message())).ThrowAsJavaScriptException();
    } catch (const std::exception& ex) {
        Napi::Error::New(env, ex.what()).ThrowAsJavaScriptException();
    } catch (...) {
        Napi::Error::New(env, "Unknown error occurred").ThrowAsJavaScriptException();
    }

    return Napi::Array::New(env);
}

Napi::String GenerateCaption(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    std::string filePath = info[0].As<Napi::String>();
    try {
        auto file = StorageFile::GetFileFromPathAsync(winrt::to_hstring(filePath)).get();
        auto stream = file.OpenAsync(FileAccessMode::Read).get();
        auto decoder = BitmapDecoder::CreateAsync(stream).get();
        auto bitmap = decoder.GetSoftwareBitmapAsync().get();

        auto readyState = ImageDescriptionGenerator::GetReadyState();
        if (readyState == AIFeatureReadyState::NotReady){
            ImageDescriptionGenerator::EnsureReadyAsync().get();
        }
        auto imageDescriptionGenerator = ImageDescriptionGenerator::CreateAsync().get();
        auto imageBuffer = ImageBuffer::CreateForSoftwareBitmap(bitmap);
        if (imageBuffer){
            ContentFilterOptions filterOptions{};
            filterOptions.PromptMaxAllowedSeverityLevel().Violent(SeverityLevel::Medium);
            filterOptions.ResponseMaxAllowedSeverityLevel().Violent(SeverityLevel::Medium);
            auto languageModelResponse = imageDescriptionGenerator.DescribeAsync(imageBuffer, ImageDescriptionKind::DiagramDescription, filterOptions).get();
            auto result = languageModelResponse.Description();
            return Napi::String::New(info.Env(), winrt::to_string(result));
        }
    } catch (const winrt::hresult_error& ex) {
        Napi::Error::New(env, winrt::to_string(ex.message())).ThrowAsJavaScriptException();
    } catch (const std::exception& ex) {
        Napi::Error::New(env, ex.what()).ThrowAsJavaScriptException();
    } catch (...) {
        Napi::Error::New(env, "Unknown error occurred").ThrowAsJavaScriptException();
    }

    return Napi::String::New(info.Env(), "Error generating caption");

}

// Initialize the module
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(Napi::String::New(env, "runTextRecognition"), Napi::Function::New(env, RunTextRecognition));
    exports.Set(Napi::String::New(env, "generateCaption"), Napi::Function::New(env, GenerateCaption));
    return exports;
}

NODE_API_MODULE(addon, Init)