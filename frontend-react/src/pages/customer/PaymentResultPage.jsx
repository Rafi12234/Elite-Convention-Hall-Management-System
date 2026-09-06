import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";

export default function PaymentResultPage() {
  const [params] = useSearchParams();

  const status = params.get("status") || "unknown";
  const bookingId = params.get("booking_id");
  const tranId = params.get("tran_id");

  const isSuccess = status === "success";

  useEffect(() => {
    sessionStorage.removeItem("dlc_selected_slot_v2");
    sessionStorage.removeItem("dlc_booking_draft_v2");
    sessionStorage.removeItem("dlc_active_hold_v2");

    if (isSuccess) {
      sessionStorage.setItem(
        "dlc_booking_pending_v1",
        JSON.stringify({
          status: "pending",
          message: "Your payment was successful and your booking is pending admin approval.",
          booking_id: bookingId || "",
          transaction_reference: tranId || "",
          submitted_at: new Date().toISOString(),
        })
      );
    }
  }, [isSuccess, bookingId, tranId]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#faf7f2",
        padding: "24px",
        fontFamily: "Poppins, system-ui, sans-serif",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "560px",
          background: "#fff",
          border: "1px solid #ead7a6",
          borderRadius: "22px",
          padding: "32px",
          boxShadow: "0 18px 45px rgba(0,0,0,0.08)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            margin: "0 auto 18px",
            background: isSuccess ? "rgba(25,135,84,0.12)" : "rgba(220,53,69,0.12)",
            color: isSuccess ? "#198754" : "#dc3545",
            fontSize: "30px",
            fontWeight: 900,
          }}
        >
          {isSuccess ? "✓" : "!"}
        </div>

        <h1 style={{ margin: "0 0 10px", color: "#1a1a2e" }}>
          {isSuccess ? "Payment Successful" : "Payment Not Completed"}
        </h1>

        <p style={{ color: "#6b7280", lineHeight: 1.7 }}>
          {isSuccess
            ? "Your payment was successful. Your booking is now pending admin approval."
            : "Your payment failed, was cancelled, or could not be verified."}
        </p>

        <div
          style={{
            margin: "22px 0",
            padding: "16px",
            background: "#fffaf0",
            borderRadius: "14px",
            textAlign: "left",
            color: "#1a1a2e",
            fontSize: "14px",
          }}
        >
          <p><strong>Status:</strong> {status}</p>
          <p><strong>Booking ID:</strong> {bookingId || "N/A"}</p>
          <p><strong>Transaction ID:</strong> {tranId || "N/A"}</p>
        </div>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            to="/customer-panel"
            style={{
              display: "inline-flex",
              padding: "12px 20px",
              borderRadius: "999px",
              background: "#b8860b",
              color: "#fff",
              textDecoration: "none",
              fontWeight: 800,
            }}
          >
            Go to Customer Panel
          </Link>

          <Link
            to="/"
            style={{
              display: "inline-flex",
              padding: "12px 20px",
              borderRadius: "999px",
              background: "#fff",
              color: "#b8860b",
              border: "1px solid #ead7a6",
              textDecoration: "none",
              fontWeight: 800,
            }}
          >
            Back to Home
          </Link>
        </div>
      </section>
    </main>
  );
}