document.addEventListener('DOMContentLoaded', function () {
    initImageUpload();
});

export function initImageUpload() {
    // Handle image selection for all "Select Image" buttons
    const uploadImageButtons = document.querySelectorAll('.upload_image_button');

    if (uploadImageButtons.length > 0) {
        uploadImageButtons.forEach(function (button) {
            initExploreUploadButton(button);
        });
    }

    // Handle image removal for all "Remove Image" buttons
    const removeImageButtons = document.querySelectorAll('.remove_image_button');

    if (removeImageButtons.length > 0) {
        removeImageButtons.forEach(function (button) {
            initExploreRemoveButton(button);
        });
    }
}

function initExploreUploadButton(button) {
    button.addEventListener('click', function (e) {
        e.preventDefault();

        // Get the direction from the button's data attribute
        const direction = this.dataset.direction;

        // Create a media uploader instance
        const imageUploader = wp.media({
            title: 'Select Asset',
            button: {
                text: 'Use This Asset'
            },
            multiple: false
        });

        // When an image is selected, update the corresponding fields
        imageUploader.on('select', function () {
            const attachment = imageUploader.state().get('selection').first().toJSON();

            // character image select.
            let imageUploadPoint = document.getElementById(`explore-character-images[${direction}]`);
            if (imageUploadPoint && 'image' === attachment.type) {
                imageUploadPoint.value = attachment.url;
            } else {
                const imageUploadParent = e.target.closest('.explore-image-field');
                if (imageUploadParent) {
                    imageUploadPoint = imageUploadParent.querySelector('.explore-upload-field');
                }
            }

            if (imageUploadPoint) {
                imageUploadPoint.value = attachment.url;
            }

            // product video
            const videoUploadPoint = document.getElementById('_product_video_url');

            if (videoUploadPoint && 'video' === attachment.type) {
                videoUploadPoint.value = attachment.url;
            }

            // product video thumbnail.
            const videoUploadThumbnail = document.getElementById('_product_video_url_thumbnail');

            if (videoUploadThumbnail && 'image' === attachment.type) {
                videoUploadThumbnail.value = attachment.url;
            }
        });

        // Open the media library
        imageUploader.open();
    });
}

function initExploreRemoveButton(button) {
    button.addEventListener('click', function (e) {
        e.preventDefault();

        // Get the direction from the button's data attribute
        const direction = this.dataset.direction;
        let characterValue = document.getElementById(`explore-character-images[${direction}]`);

        // character image select.
        if (characterValue) {
        } else {
            const imageUploadParent = e.target.closest('.explore-image-field');
            if (imageUploadParent) {
                characterValue = imageUploadParent.querySelector('.explore-upload-field');
            }
        }

        if (characterValue) {
            characterValue.value = '';
        }
    });
}

window.initExploreUploadButton = initExploreUploadButton;
window.initExploreRemoveButton = initExploreRemoveButton;
