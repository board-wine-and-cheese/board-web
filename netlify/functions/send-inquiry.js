// Netlify Function + Resend email handler with optional resume attachment support.
// Required Netlify environment variables:
// RESEND_API_KEY
// INQUIRY_TO_EMAIL      e.g. cscala@mainecheeseboard.com
// INQUIRY_FROM_EMAIL    e.g. Board Website <hello@yourverifieddomain.com>

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { formKey = 'inquiry', fields = {}, attachments = [] } = payload;

    const resendApiKey = process.env.RESEND_API_KEY;
    const toEmail = process.env.INQUIRY_TO_EMAIL;
    const fromEmail = process.env.INQUIRY_FROM_EMAIL || 'Board Website <onboarding@resend.dev>';

    if (!resendApiKey) {
      throw new Error('Missing RESEND_API_KEY environment variable.');
    }

    if (!toEmail) {
      throw new Error('Missing INQUIRY_TO_EMAIL environment variable.');
    }

    const label = getFormLabel(formKey);
    const subject = getSubject(formKey, fields);
    const safeAttachments = normalizeAttachments(attachments);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject,
        html: buildHtml(label, fields),
        text: buildText(label, fields),
        attachments: safeAttachments.length ? safeAttachments : undefined,
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        result?.message ||
          result?.error?.message ||
          'Resend failed to send the email.'
      );
    }

    return jsonResponse(200, { ok: true, id: result.id || null });
  } catch (error) {
    return jsonResponse(500, {
      error: error.message || 'Unable to send inquiry.',
    });
  }
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}

function getFormLabel(formKey) {
  const labels = {
    contact: 'Contact Inquiry',
    catering: 'Catering Inquiry',
    private_events: 'Private Event Inquiry',
    reservation: 'Reservation Request',
    jobs: 'Job Application',
  };

  return labels[formKey] || 'Website Inquiry';
}

function getSubject(formKey, fields) {
  const label = getFormLabel(formKey);
  const name = fields.name ? ` from ${fields.name}` : '';

  if (formKey === 'jobs') {
    const role = fields.experience_type || 'Applicant';
    return `Board Job Application — ${role}${name}`;
  }

  if (formKey === 'reservation') {
    const date = fields.date || fields.requested_date || '';
    const time = fields.time || fields.requested_time || '';
    const suffix = `${date} ${time}`.trim();
    return `Board ${label}${name}${suffix ? ` — ${suffix}` : ''}`;
  }

  return `Board ${label}${name}`;
}

function buildHtml(label, fields) {
  const rows = Object.entries(fields)
    .filter(([key, value]) => {
      return (
        key !== 'resume_file' &&
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ''
      );
    })
    .map(([key, value]) => {
      return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600;text-transform:capitalize;">${escapeHtml(formatKey(key))}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(String(value))}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#222;">
      <h2 style="margin:0 0 12px;">${escapeHtml(label)}</h2>
      <p style="margin:0 0 18px;">New submission from the Board website.</p>
      <table style="border-collapse:collapse;width:100%;max-width:760px;border:1px solid #eee;">
        <tbody>
          ${rows || '<tr><td style="padding:12px;">No fields submitted.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function buildText(label, fields) {
  const lines = [`${label}`, 'New submission from the Board website.', ''];

  Object.entries(fields)
    .filter(([key, value]) => {
      return (
        key !== 'resume_file' &&
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ''
      );
    })
    .forEach(([key, value]) => {
      lines.push(`${formatKey(key)}: ${String(value)}`);
    });

  return lines.join('\n');
}

function normalizeAttachments(attachments) {
  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments
    .filter((attachment) => {
      return (
        attachment &&
        typeof attachment.filename === 'string' &&
        typeof attachment.content === 'string' &&
        attachment.filename.trim() &&
        attachment.content.trim()
      );
    })
    .slice(0, 1)
    .map((attachment) => ({
      filename: attachment.filename,
      content: stripBase64Prefix(attachment.content),
      content_type:
        attachment.contentType ||
        attachment.content_type ||
        'application/octet-stream',
    }));
}

function stripBase64Prefix(value) {
  return String(value).replace(/^data:[^;]+;base64,/, '');
}

function formatKey(key) {
  return String(key).replace(/_/g, ' ');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
