# AEM Embed Simulator (experimental)
Embeds AEM fragments into a page.

## Local installation

1. Clone this repository to your disk: `git clone https://github.com/rofe/embed-simulator.git`
1. Open Chrome and navigate to the _Extensions_ page at `chrome://extensions`
1. Turn on _Developer mode_ at the top right of the header bar<br />
   <img width="170" alt="Enable developer mode" src="https://github.com/user-attachments/assets/417699bd-96ec-45fe-9b57-40d2d2831ad2" />
1. Click the _Load unpacked_ button in the action bar<br />
   <img width="158" alt="Load unpacked extension" src="https://github.com/user-attachments/assets/36afe393-e8a8-4197-b566-a0a5ba811035" />
1. Navigate to the `src` folder and click _Select_ to install and activate the extension:<br />
   <img width="667" alt="Select src folder" src="https://github.com/user-attachments/assets/f6fb0946-8e4d-4bb1-8dab-943248a6f2c2" />
1. Verify that your _Extensions_ page displays a card like this:<br />
   <img width="417" alt="Extension " src="https://github.com/user-attachments/assets/c7ab9d65-619e-4dcd-a9c5-8cc84c907613" />
1. Click the extension icon in the toolbar and pin the extension:<br />
   <img width="336" alt="Pin extension" src="https://github.com/user-attachments/assets/177b608c-b968-48f2-a003-688ba5ab72b7" />

   

## Usage

### Add embed

1. Navigate to the page you want to add an embed to
1. Click the extension icon to open the popup
1. In the popup, click _Add Embed_
1. Click an element on the page to select the embed's location
1. In the popup, enter the embed URL
1. Optionally enter name, width and height of the embed
1. Click _Confirm_
1. The embed gets is now added to your page at the selected location

### Delete embed

1. Navigate to the page you want to delete an embed from
1. Click the extension icon to open the popup
1. In the popup, click the _x_ button of the embed you want to delete
1. The embed is now deleted from your page
