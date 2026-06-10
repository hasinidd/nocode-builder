import html2pdf from "html2pdf.js";

export async function downloadHtmlAsPdf(htmlUrl: string, fileName: string = "document.pdf") {
  try {
    // Fetch the HTML content
    const resp = await fetch(htmlUrl);
    if (!resp.ok) throw new Error(`Failed to fetch document: ${resp.status}`);
    const html = await resp.text();

    // Create a temporary container
    const container = document.createElement("div");
    container.innerHTML = html;
    
    // Extract body content and styles
    const bodyContent = container.querySelector("body");
    const styleTag = container.querySelector("style");
    
    const wrapper = document.createElement("div");
    wrapper.style.position = "absolute";
    wrapper.style.left = "-9999px";
    wrapper.style.top = "0";
    wrapper.style.width = "210mm"; // A4 width
    wrapper.style.background = "#fff";
    wrapper.style.color = "#1f2937";
    
    if (styleTag) wrapper.appendChild(styleTag.cloneNode(true));
    if (bodyContent) {
      wrapper.innerHTML += bodyContent.innerHTML;
    } else {
      wrapper.innerHTML += html;
    }
    
    document.body.appendChild(wrapper);

    const opt = {
      margin: 0,
      filename: fileName,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true,
        width: 794, // A4 width in px at 96dpi
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    await html2pdf().set(opt).from(wrapper).save();
    
    // Cleanup
    document.body.removeChild(wrapper);
  } catch (e) {
    console.error("PDF download error:", e);
    throw e;
  }
}
