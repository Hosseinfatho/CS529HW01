Instructions
Credits: This support code has been written by Andrew Wentzel, a member of the Electronic Visualization Laboratory at UIC.

Installing Node and npm
There are several ways to install node.js which is required to run react.

The easiest way is to simply install node from the website:

https://nodejs.org/en/download

During the node installation, npm will be fetched as well. For your own benefit, ignore any warning messages resulting through the installation process.

Verify the installations using node -v and npm -v in the terminal. If any of the verification steps gives you a command not found error, you most likely don't have the binary path to the library on your PATH variable (check Environmental Variables on windows). Related to this point, tools like NodeJS or git also provide their own shell (terminal) but you can use everything from your normal terminal; just make sure that your PATH is configured correctly.

For the next steps, please consult the homework handout.

If you are using ubuntu and have multiple node versions installed, you could try also Node Version Manager
We recommend using Node Version Manager (NVM), if you are using ubuntu (we haven't tested it on other OS):

https://github.com/nvm-sh/nvm

In the command line, use NVM to install Node. We built this demo using node v14.15.4, but any version that support create-react-app should work:

nvm install 14.15.4

Fork the Hw01 support code repository or download the .zip
If you are familiar with Github, then fork this repository and proceed to your copy of the subfolders in the repository. Otherwise, just download the zip with all the files.

For this assignment, you will only need to work (i.e., edit) the following files: src/App.js, src/Blackhat.js, src/Blackhatstats.js, src/Whitehat.js and src/Whitehatstats.js.

In your unzipped folder, run

npm install

(and for your own benefit, please ignore any warning messages resulting from the command above)

then test the result of the support code like this:

npm start

If all goes well, it will automatically open a browser view to localhost:3000 (or similar) and show you the result of the support code.

If you just pull from Gitub (instead of downloading the zip as above): Pulling the project from Github
clone the github repo :

git clone https://github.com/uic-evl/CS529HW1.git

Install the required npm packages:

cd CS529HW1

npm install

Test the program

npm start

If all goes well, it will automatically launch a browser view to localhost:3000 (or similar) and show you the result of the support code.