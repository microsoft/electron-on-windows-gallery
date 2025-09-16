# Electron Gallery

Welcome to Electron Gallery. An Electron application which displays the range of native Windows functionality which can be accessed from Electron applications. Electron Gallery is currently in development; it is not yet published to the Microsoft Store. 

## Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit [Contributor License Agreements](https://cla.opensource.microsoft.com).

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

### Setup the Environment
1. If you're new to building Electron apps, make sure your machine meets Electron's [system prerequisites](https://www.electronjs.org/docs/latest/tutorial/tutorial-prerequisites). 
1. Install the WindowsAppRuntime for the WinAppSDK package version listed in [winsdk.yaml](https://github.com/microsoft/electron-gallery/blob/main/winsdk.yaml).

### Build
To build Electron Gallery, follow the following steps: 
1. Clone the repo.
1. Run `yarn`
1. Clone the [microsoft/winsdk-electron](https://github.com/microsoft/winsdk-electron) repository. 
1. In the winsdk-electron repo, `cd src` & `npm pack`.
1. In the electron-gallery repo, run `npm install -g <path to windows-sdks-1.0,0.tgz>`.
1. Run `winsdk setup --experimental`. Validate `.winsdk` directory has been created.
1. Run `yarn run start` to build and launch the app.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft
trademarks or logos is subject to and must follow
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
