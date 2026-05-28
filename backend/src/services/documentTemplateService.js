import supabase from '../db/supabase.js';

export class DocumentTemplateService {
  async renderTemplate(templateId, variables = {}) {
    const { data: tpl, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error || !tpl) {
      return this._fallbackRender(variables);
    }

    let renderedHtml = tpl.html_body;
    Object.entries(variables).forEach(([key, val]) => {
      const regex = new RegExp(`{{\s*${key}\s*}}`, 'g');
      renderedHtml = renderedHtml.replace(regex, String(val ?? ''));
    });

    return { title: tpl.title, html: renderedHtml };
  }

  _fallbackRender(vars) {
    return {
      title: vars.title || 'Document Agreement',
      html: `
        <div style="font-family: sans-serif; padding: 30px;">
          <h2>${vars.title || 'Service Agreement'}</h2>
          <p>Client Name: <strong>${vars.clientName || 'Valued Customer'}</strong></p>
          <p>Date: ${new Date().toLocaleDateString()}</p>
          <hr />
          <p>${vars.content || 'Standard terms and conditions apply.'}</p>
        </div>
      `
    };
  }
}

export const documentTemplateService = new DocumentTemplateService();
export default documentTemplateService;
