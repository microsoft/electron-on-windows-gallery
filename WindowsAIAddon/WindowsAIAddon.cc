#include <napi.h>
#include <shobjidl_core.h>
#include <windows.h>

#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.Storage.h>
#include <winrt/Windows.Storage.Streams.h>
#include <winrt/Microsoft.Windows.AI.Imaging.h>
#include <winrt/Windows.Graphics.Imaging.h>
#include <winrt/Microsoft.Graphics.Imaging.h>
#include <winrt/Windows.Data.Xml.Dom.h>

using namespace winrt;
using namespace Windows::Storage;
using namespace Windows::Storage::Streams;
using namespace Windows::Graphics::Imaging;
using namespace Microsoft::Windows::AI;
using namespace Microsoft::Windows::AI::Imaging;
using namespace Microsoft::Graphics::Imaging;
using namespace Windows::Data::Xml::Dom;


Napi::Value RunTextRecognition(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    try {
        auto file = StorageFile::GetFileFromPathAsync(L"C:\\Users\\chiaramooney\\electron-gallery\\assets\\OCR.png").get();
        auto stream = file.OpenAsync(FileAccessMode::Read).get();
        auto decoder = BitmapDecoder::CreateAsync(stream).get();
        auto bitmap = decoder.GetSoftwareBitmapAsync().get();

        // Validate the decoded SoftwareBitmap
        if (!bitmap)
        {
            Napi::Error::New(env, "Failed to decode image to SoftwareBitmap").ThrowAsJavaScriptException();
            return Napi::Array::New(env);
        }

        auto readyState = TextRecognizer::GetReadyState();
        if (readyState == AIFeatureReadyState::NotReady){
            TextRecognizer::EnsureReadyAsync().get();
        }

        auto textRecognizer = TextRecognizer::CreateAsync().get();
        auto imageBuffer = ImageBuffer::CreateForSoftwareBitmap(bitmap);

        // Validate the created ImageBuffer
        // ImageBuffer is a WinRT object; compare to nullptr to check validity
        if (!imageBuffer)
        {
            Napi::Error::New(env, "Failed to create ImageBuffer from SoftwareBitmap").ThrowAsJavaScriptException();
            return Napi::Array::New(env);
        }

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

// Initialize the module
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(Napi::String::New(env, "runTextRecognition"), Napi::Function::New(env, RunTextRecognition));
    return exports;
}

NODE_API_MODULE(addon, Init)