#include <napi.h>
#include <shobjidl_core.h>
#include <windows.h>

#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.Data.Xml.Dom.h>

using namespace winrt;
//using namespace Microsoft::Windows::AI;
//using namespace Microsoft::Windows::AI::Text;
using namespace Windows::Data::Xml::Dom;

// Function to display a Windows notification
Napi::String GenerateText(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    try {
        // Get arguments from JavaScript (title and message)
        std::string prompt = info[0].As<Napi::String>();

        // if (LanguageModel::GetReadyState() == AIFeatureReadyState::NotReady)
        // {
        //     auto op = LanguageModel::EnsureReadyAsync().get();
        // }

        // auto languageModel = LanguageModel::CreateAsync().get();

        // LanguageModelResponseResult responseResult = languageModel.GenerateResponseAsync(winrt::to_hstring(prompt)).get();

        // std::string result = winrt::to_string(responseResult.Text());

        std::string result = "test result";

        return Napi::String::New(env, result);
    } catch (const winrt::hresult_error& ex) {
        Napi::Error::New(env, winrt::to_string(ex.message())).ThrowAsJavaScriptException();
    } catch (const std::exception& ex) {
        // Handle exceptions and throw back to JavaScript
        Napi::Error::New(env, ex.what()).ThrowAsJavaScriptException();
    } catch (...) {
        Napi::Error::New(env, "Unknown error occurred").ThrowAsJavaScriptException();
    }

    return Napi::String::New(env, "Error generating text");
}

// Initialize the module
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(Napi::String::New(env, "generateText"), Napi::Function::New(env, GenerateText));
    return exports;
}

NODE_API_MODULE(addon, Init)