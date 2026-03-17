# Image Metadata

When uploading media the user can pass a name and a caption. This data is stored in the media table of the database.

So that this data is not lost when the images are downloaded, this data needs to be stored in the images.

Apple stores user entered captions in the `IPTC:Caption-Abstract` tag

Other interesting meta data:

- `Data/Time Created`
- `User Comment` - on Apple will contain 'Screenshot' if it is a screenshot
- `Mime Type`
- `Device Manufacturer`
