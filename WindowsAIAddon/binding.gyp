{
  "targets": [
    {
      "target_name": "WindowsAIAddon",
      "target_arch": "arm64",
      "sources": ["WindowsAIAddon.cc"],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "<!(node -e \"require('nan')\")",
        "<!@(node -p \"require('windows-sdks').getNugetPackagePath('Microsoft.WindowsAppSDK').replace(/\\\\/g, '/') + '/include'\")",
        "<!@(node -p \"require('windows-sdks').getNugetPackagePath('Microsoft.WindowsAppSDK.Foundation').replace(/\\\\/g, '/') + '/include'\")",
        "../.winsdk/generated/include",
      ],
      "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ],
      "library_dirs": [
        "<!@(node -p \"require('windows-sdks').getNugetPackagePath('Microsoft.WindowsAppSDK.Foundation').replace(/\\\\/g, '/') + '/lib/native/<(target_arch)'\")",
        "../build/<(target_arch)/Release"
      ],
      "libraries": [
        "WindowsApp.lib",
        "Microsoft.WindowsAppRuntime.Bootstrap.lib"
      ]
    }
  ]
}