#include <napi.h>
#include <shobjidl_core.h>
#include <windows.h>

#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.UI.Notifications.h>
#include <winrt/Windows.Data.Xml.Dom.h>

using namespace winrt;
using namespace Windows::UI::Notifications;
using namespace Windows::Data::Xml::Dom;

// Helper function to escape XML special characters
std::wstring EscapeXml(const std::string& input) {
    std::wstring result;
    result.reserve(input.size() * 1.2);  // Reserve space for potential escapes
    
    for (char c : input) {
        switch (c) {
            case '&':
                result += L"&amp;";
                break;
            case '<':
                result += L"&lt;";
                break;
            case '>':
                result += L"&gt;";
                break;
            case '"':
                result += L"&quot;";
                break;
            case '\'':
                result += L"&apos;";
                break;
            default:
                result += static_cast<wchar_t>(static_cast<unsigned char>(c));
                break;
        }
    }
    return result;
}

// Function to display a Windows notification
void ShowNotification(const Napi::CallbackInfo& info) {
    auto env = info.Env();

    try {
        // Get arguments from JavaScript (title and message)
        auto title = std::string(info[0].As<Napi::String>());
        auto message = std::string(info[1].As<Napi::String>());

        // Define notification XML
        auto xml = std::wstring(L"<toast><visual><binding template='ToastGeneric'><text>");
        xml += EscapeXml(title);
        xml += L"</text><text>";
        xml += EscapeXml(message);
        xml += L"</text></binding></visual></toast>";

        // Create a ToastNotificationManager
        auto notifier = ToastNotificationManager::CreateToastNotifier();

        // Parse the XML
        auto toastXml = XmlDocument();
        toastXml.LoadXml(xml);
        
        // Create a toast notification
        auto toast = ToastNotification{ toastXml };
        notifier.Show(toast);
    } catch (const winrt::hresult_error& ex) {
        Napi::Error::New(env, winrt::to_string(ex.message())).ThrowAsJavaScriptException();
    } catch (const std::exception& ex) {
        // Handle exceptions and throw back to JavaScript
        Napi::Error::New(env, ex.what()).ThrowAsJavaScriptException();
    } catch (...) {
        Napi::Error::New(env, "Unknown error occurred").ThrowAsJavaScriptException();
    }
}

// Function to display a badge notification with count 1
void ShowBadgeNotification(const Napi::CallbackInfo& info) {
    auto env = info.Env();

    try {
        auto showBadge = info[0].As<Napi::Boolean>();
        auto badgeUpdater = BadgeUpdateManager::CreateBadgeUpdaterForApplication();
        if (showBadge) {
            // Create badge XML with value 1
            auto badgeXml = std::wstring(L"<badge value='1'/>");
            auto xmlDoc = XmlDocument();
            xmlDoc.LoadXml(badgeXml);
            auto badge = BadgeNotification(xmlDoc);
            badgeUpdater.Update(badge);
        } else {
            // Remove the badge
            badgeUpdater.Clear();
        }
    } catch (const winrt::hresult_error& ex) {
        Napi::Error::New(env, winrt::to_string(ex.message())).ThrowAsJavaScriptException();
    } catch (const std::exception& ex) {
        Napi::Error::New(env, ex.what()).ThrowAsJavaScriptException();
    } catch (...) {
        Napi::Error::New(env, "Unknown error occurred").ThrowAsJavaScriptException();
    }
}

// Function to copy a string to the Windows clipboard
void CopyToClipboard(const Napi::CallbackInfo& info) {
    auto env = info.Env();
    try {
        auto input = std::string(info[0].As<Napi::String>());
        auto winput = std::wstring(input.begin(), input.end());
        if (OpenClipboard(nullptr)) {
            EmptyClipboard();
            auto size = (winput.length() + 1) * sizeof(wchar_t);
            auto hMem = GlobalAlloc(GMEM_MOVEABLE, size);
            if (hMem) {
                auto ptr = GlobalLock(hMem);
                memcpy(ptr, winput.c_str(), size);
                GlobalUnlock(hMem);
                SetClipboardData(CF_UNICODETEXT, hMem);
            }
            CloseClipboard();
        } else {
            Napi::Error::New(env, "Failed to open clipboard").ThrowAsJavaScriptException();
        }
    } catch (const std::exception& ex) {
        Napi::Error::New(env, ex.what()).ThrowAsJavaScriptException();
    } catch (...) {
        Napi::Error::New(env, "Unknown error occurred").ThrowAsJavaScriptException();
    }
}

// Function to open a file picker and return the selected file name
Napi::String OpenNewFile(const Napi::CallbackInfo& info) {
    auto env = info.Env();
    auto fileName = std::wstring();
    auto hr = HRESULT();
    auto pFileOpen = (IFileOpenDialog*)nullptr;
    hr = CoInitializeEx(NULL, COINIT_APARTMENTTHREADED | COINIT_DISABLE_OLE1DDE);
    if (SUCCEEDED(hr)) {
        hr = CoCreateInstance(CLSID_FileOpenDialog, NULL, CLSCTX_INPROC_SERVER, IID_PPV_ARGS(&pFileOpen));
        if (SUCCEEDED(hr)) {
            hr = pFileOpen->Show(NULL);
            if (SUCCEEDED(hr)) {
                auto pItem = (IShellItem*)nullptr;
                hr = pFileOpen->GetResult(&pItem);
                if (SUCCEEDED(hr)) {
                    auto pszFilePath = (PWSTR)nullptr;
                    hr = pItem->GetDisplayName(SIGDN_FILESYSPATH, &pszFilePath);
                    if (SUCCEEDED(hr) && pszFilePath) {
                        fileName = pszFilePath;
                        CoTaskMemFree(pszFilePath);
                    }
                    pItem->Release();
                }
            }
            pFileOpen->Release();
        }
        CoUninitialize();
    }
    if (!fileName.empty()) {
        auto result = std::string(fileName.begin(), fileName.end());
        return Napi::String::New(env, result);
    } else {
        return Napi::String::New(env, "");
    }
}

// Initialize the module
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    auto showNotifFunc = Napi::Function::New(env, ShowNotification);
    auto badgeFunc = Napi::Function::New(env, ShowBadgeNotification);
    auto clipboardFunc = Napi::Function::New(env, CopyToClipboard);
    auto fileFunc = Napi::Function::New(env, OpenNewFile);
    exports.Set(Napi::String::New(env, "showNotification"), showNotifFunc);
    exports.Set(Napi::String::New(env, "showBadgeNotification"), badgeFunc);
    exports.Set(Napi::String::New(env, "copyToClipboard"), clipboardFunc);
    exports.Set(Napi::String::New(env, "openNewFile"), fileFunc);
    return exports;
}

NODE_API_MODULE(addon, Init)