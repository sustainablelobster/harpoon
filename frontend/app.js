const ELEMENT_IDS = {
    form: "form",
    image: "image",
    output: "output",
    platform: "platform"
};

function getElementById(id) {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`No element with ID "${id}".`);
    }
    return element;
}

function disableForm(isDisabled) {
    const form = getElementById(ELEMENT_IDS.form);
    for (const element of form.elements) {
        element.disabled = isDisabled;
    }
}

function setOutput(message, isHTML) {
    const output = getElementById(ELEMENT_IDS.output);
    if (isHTML) {
        output.innerHTML = message;
    } else {
        output.textContent = message;
    }
}

function sanitize(s) {
    return s.replace(/[^A-Za-z0-9_.-]/g, "_");
}

function getTarballPath(image, platform) {
    let path = `${CONFIG.imagesRoot}/${sanitize(image)}`;
    if (platform) {
        path += `_${sanitize(platform)}`;
    }
    path += ".tar.gz";
    return path;
}

async function isTarballCached(tarballPath) {
    const response = await fetch(tarballPath, { method: "HEAD" });
    return response.ok;
}

async function requestImage(image, platform) {
    return await fetch(CONFIG.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            image: image,
            platform: platform
        })
    });
}

async function formEventListener(event) {
    event.preventDefault();
    disableForm(true);
    setOutput("Working...", false);

    let output = ["ERROR: Unknown error occurred", false];

    try {
        const image = getElementById(ELEMENT_IDS.image).value;
        const platform = getElementById(ELEMENT_IDS.platform).value;
        const tarballPath = getTarballPath(image, platform);
        let isTarballAvailable = await isTarballCached(tarballPath);
        let errorMessage = "";

        if (!isTarballAvailable) {
            const response = await requestImage(image, platform);
            isTarballAvailable = response.ok;
            errorMessage = await response.text();
        }

        if (isTarballAvailable) {
            output = [`<a href="${tarballPath}">Download</a>`, true];
        } else {
            output = [`ERROR: ${errorMessage}`, false];
        }
    } catch (error) {
        output = [`ERROR: ${error.message}`, false];
    }

    setOutput(...output);
    disableForm(false);
}

getElementById(ELEMENT_IDS.form).addEventListener("submit", formEventListener);
