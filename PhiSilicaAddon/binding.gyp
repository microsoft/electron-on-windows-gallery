{
  "targets": [
    {
      "target_name": "PhiSilicaAddon",
      "sources": ["PhiSilicaAddon.cc"],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "<!@(node -p \"require('windows-sdks').getNugetPackagePath('Microsoft.WindowsAppSDK').replace(/\\\\/g, '/') + '/include'\")",
        "<!@(node -p \"require('windows-sdks').getNugetPackagePath('Microsoft.WindowsAppSDK.Foundation').replace(/\\\\/g, '/') + '/include'\")",
        ".winsdk/generated/include"
      ],
      "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ],
      "library_dirs": [
        "<!@(node -p \"require('windows-sdks').getNugetPackagePath('Microsoft.WindowsAppSDK').replace(/\\\\/g, '/') + '/lib/win10-<(target_arch)'\")",
        "../build/<(target_arch)/Release"
      ],
      "library_dirs": [
        "<!@(node -p \"require('windows-sdks').getNugetPackagePath('Microsoft.WindowsAppSDK.Foundation').replace(/\\\\/g, '/') + '/lib/native/<(target_arch)'\")"
      ],
      "libraries": [
        "WindowsApp.lib",
        "Microsoft.WindowsAppRuntime.Bootstrap.lib"
      ]
    }
  ]
}