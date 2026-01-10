export const emailHTML = (
  name: string,
  email: string,
  phone: string,
  qrImage: string,
  concertName: string,
  concertDesc: string,
  date: Date,
  startTime: Date,
  endTime: Date,
  location: string,
  poster: string,
  artistName: string,
  ticketQty: number,
  totalPaid: number,
  ticketStatus: string
) => {
  const showDate = formatDate(date);
  const showStart = formatTime(startTime);
  const showEnd = formatTime(endTime);

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Your Ticket</title>
</head>

<body style="margin:0; padding:0; background:#eef2f7; font-family:Arial, sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center" style="padding:30px 12px;">

<!-- Outer Card -->
<table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.08);">

<!-- Branding Header -->
<tr>
<td align="center" style="background:#ffffff; padding:24px;">
  <h1 style="margin:0; font-size:28px; letter-spacing:0.5px;">
    <span style="color:#e11d48;">book</span><span style="color:#111827;">myshow</span>
  </h1>
  <p style="margin:8px 0 0; font-size:15px; color:#16a34a; font-weight:bold;">
    ✔ Your booking is confirmed!
  </p>
</td>
</tr>

<!-- Ticket Body -->
<tr>
<td style="padding:20px 24px;">

<table width="100%" cellpadding="0" cellspacing="0">

<tr>

<!-- Poster -->
<td width="160" valign="top">
  <img 
    src="${poster}" 
    width="150" 
    style="border-radius:8px; display:block;" 
  />
</td>

<!-- Event Info -->
<td valign="top" style="padding-left:16px;">

  <h2 style="margin:0; font-size:20px; color:#111827;">
    ${concertName}
  </h2>

  <p style="margin:6px 0; font-size:14px; color:#374151;">
    ${concertDesc || "Live concert experience"}
  </p>

  <p style="margin:4px 0; font-size:14px;">
    🎤 Artist: <strong>${artistName || "N/A"}</strong>
  </p>

  <p style="margin:4px 0; font-size:14px;">
    📅 ${showDate}
  </p>

  <p style="margin:4px 0; font-size:14px;">
    ⏰ ${showStart} – ${showEnd}
  </p>

  <p style="margin:4px 0; font-size:14px;">
    📍 ${location}
  </p>

</td>

</tr>
</table>

</td>
</tr>

<!-- Divider -->
<tr>
<td style="border-top:2px dashed #e5e7eb;"></td>
</tr>

<!-- QR + Ticket Info -->
<tr>
<td style="padding:20px 24px;">
<table width="100%" cellpadding="0" cellspacing="0">

<tr>

<!-- QR -->
<td width="260" align="center" valign="top">
  <img 
    src="${qrImage}" 
    width="200" 
    style="border:1px solid #e5e7eb; padding:8px; border-radius:8px;" 
  />
  <p style="margin-top:8px; font-size:12px; color:#6b7280;">
    Show this QR at entry gate
  </p>
</td>

<!-- Ticket Summary -->
<td valign="top" style="padding-left:16px;">

<table width="100%" cellpadding="6" cellspacing="0">

<tr>
<td>🎟 Tickets</td>
<td align="right"><strong>${ticketQty}</strong></td>
</tr>

<tr>
<td>💰 Total Paid</td>
<td align="right"><strong>₹${totalPaid}</strong></td>
</tr>

<tr>
<td>✅ Status</td>
<td align="right"><strong>${ticketStatus}</strong></td>
</tr>

<tr>
<td colspan="2" style="padding-top:10px;">
<hr style="border:none; border-top:1px solid #e5e7eb;" />
</td>
</tr>

<tr>
<td colspan="2" style="font-size:13px;">
<strong>Attendee</strong><br/>
${name}<br/>
${email}<br/>
${phone || "N/A"}
</td>
</tr>

</table>

</td>
</tr>

</table>
</td>
</tr>

<!-- Footer -->
<tr>
<td align="center" style="padding:18px; font-size:12px; color:#9ca3af;">
  © BookMyShow · This ticket is auto-generated
</td>
</tr>

</table>

</td>
</tr>
</table>
</body>
</html>
`;
};

export const base64ToBuffer = (base64: string) => {
  const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, "");
  return Buffer.from(cleanBase64, "base64");
};

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);

const formatTime = (date: Date) =>
  new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
