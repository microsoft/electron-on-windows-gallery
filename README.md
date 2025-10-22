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

## Getting started
### 1. Set up the environment
1. If you're new to building Electron apps, make sure your machine meets Electron's [system prerequisites](https://www.electronjs.org/docs/latest/tutorial/tutorial-prerequisites). 
1. Install the WindowsAppRuntime for the WinAppSDK package version listed in [winsdk.yaml](https://github.com/microsoft/electron-gallery/blob/main/winsdk.yaml).

### 2. Clone the repository
```shell
git clone https://github.com/microsoft/electron-gallery.git
```

### 3. Set up the winsdk Package
```shell
git clone https://github.com/microsoft/winsdk.git
cd .\winsdk\scripts\
.\build-cli.ps1
```

The node package will be built on the `winsdk\scripts\artifacts\` folder.
Make sure the built package name matches what you have on your `package.json` file.
For example, if the file generated is called `microsoft-winsdk-0.1.0-prerelease.59.tgz`, 
then in your `package.json` file you should have:
```json
     "@microsoft/winsdk": "file:../winsdk/artifacts/microsoft-winsdk-0.1.0-prerelease.59.tgz"
```

Then you can just restore the local packages usign `yarn`:
```shell
cd \<path to electron-gallery repo\>
yarn install
```

> **_NOTE:_** If you have a hash issue with the restore (related to the winsdk package), just delete the `yarn.lock` file and call `yarn install` again.

### 4. Build and Run
```shell
yarn winsdk restore
yarn run build-all
yarn run setup-debug
yarn run start
```

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft
trademarks or logos is subject to and must follow
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
