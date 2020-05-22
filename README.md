# Music feat. Beocreate 2

Service-agnostic music browser extension for Beocreate 2.

#### Beautiful presentation

Present the user's music collection in attractive and intuitive ways.

#### Service-agnostic

Supports multiple sources/services at once. Individual services are their own extensions that plug into the Music API, handling "translation" between the service and the Music extension. Music will take care of handling possible overlap between services.

## Installation & Use

*Note:* this extension is in early stages of development and is provided for testing purposes only at this time.

- Make sure you're using Beocreate 2 from May 2020 or newer.
- Copy the files to */etc/beo-extensions/music/* and restart the server (*systemctl restart beocreate2*)