# Duplicate Uploads

Do not allow the upload of duplicate media.

If a user uploads media that has been previously deleted:

- restore the image if the `session_id` and the `deleted_by` fields of the media are equal to the current `session_id`. Name and caption should be updated to the current uploaded values for the media
- otherwise, deny the image upload (the current logic)
