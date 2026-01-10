export const emailHTML = ( name : string , email : string , phone : string ,  qrImage : string , concertName : string , concertDesc : string , artistName : string, ticketQty : number, totalPaid : number , ticketStatus : string) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Your Ticket</title>
</head>

<body style="margin:0; padding:0; background:#f3f4f6; font-family:Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:32px 0;">
        <table width="560" cellpadding="0" cellspacing="0" 
          style="background:#ffffff; border-radius:10px; padding:28px;">

          <!-- Header -->
          <tr>
            <td align="center">
              <h2 style="margin:0; color:#111;">🎫 Your Ticket Is Confirmed</h2>
              <p style="color:#555; margin-top:6px;">
                Hi <strong>${
                 name
                }</strong>, your booking is successful.
              </p>
            </td>
          </tr>

          <!-- QR -->
          <tr>
            <td align="center" style="padding:24px 0;">
              <img
                src="${qrImage}"
                width="260"
                alt="Ticket QR Code"
                style="border:1px solid #e5e7eb; padding:10px; border-radius:8px;"
              />
              <p style="font-size:13px; color:#777; margin-top:8px;">
                Show this QR code at the entry gate
              </p>
            </td>
          </tr>

          <!-- Concert Info -->
          <tr>
            <td style="padding:12px 0;">
              <h3 style="margin:0; color:#111;">🎵 ${
               concertName
              }</h3>
              <p style="margin:6px 0; color:#555;">
                ${
                 concertDesc ?? 
                  "No description available"
                }
              </p>
              <p style="margin:4px 0; color:#444;">
                Artist: <strong>${
                  artistName ?? "N/A"
                }</strong>
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="border-top:1px solid #e5e7eb; padding-top:16px;"></td>
          </tr>

          <!-- Ticket Details -->
          <tr>
            <td>
              <table width="100%" cellpadding="6" cellspacing="0">
                <tr>
                  <td style="color:#555;">Tickets</td>
                  <td align="right"><strong>${ticketQty}</strong></td>
                </tr>
                <tr>
                  <td style="color:#555;">Total Paid</td>
                  <td align="right"><strong>₹${
                   totalPaid
                  }</strong></td>
                </tr>
                <tr>
                  <td style="color:#555;">Status</td>
                  <td align="right"><strong>${
                   ticketStatus
                  }</strong></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="border-top:1px solid #e5e7eb; padding-top:16px;"></td>
          </tr>

          <!-- User Info -->
          <tr>
            <td>
              <h4 style="margin:0 0 6px 0;">👤 Attendee Details</h4>
              <p style="margin:4px 0; color:#555;">Name: ${name}</p>
              <p style="margin:4px 0; color:#555;">Email: ${email}</p>
              <p style="margin:4px 0; color:#555;">Phone: ${
                phone ?? "N/A"
              }</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="font-size:12px; color:#888;">
                If you have any issues, contact support.<br/>
                © BookMyShow Clone
              </p>
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
