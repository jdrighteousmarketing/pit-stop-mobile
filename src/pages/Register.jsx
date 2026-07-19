import { restaurantConfig } from '@/config/restaurantConfig';
import React from "react";
import { Link } from "react-router-dom";

export default function Register() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#080604" }}
    >
      {/* Top bar links */}
      <div className="flex justify-between px-5 pt-4 absolute top-0 left-0 right-0 z-20">
        <Link
          to="/employee-login"
          className="text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded-full border border-amber-500/40 text-amber-400/80 hover:text-amber-300 hover:border-amber-400 transition-all"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Employee Sign In
        </Link>
        <Link
          to="/admin-login"
          className="text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded-full border border-amber-500/40 text-amber-400/80 hover:text-amber-300 hover:border-amber-400 transition-all"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Admin Login
        </Link>
      </div>

      {/* Full-width hero image */}
      <img
  src={restaurantConfig.signupHeroImage}
  alt={`${restaurantConfig.restaurantName} Sign Up`}
        className="w-full block"
        style={{ display: "block" }}
      />

      {/* Below-image section */}
      <div
        className="flex flex-col items-center px-5 py-8 gap-6"
        style={{ background: "#080604" }}
      >
        {/* Sign Up Button */}
        <Link
          to="/signup"
          className="w-full max-w-sm flex items-center justify-center h-16 rounded-2xl font-black tracking-widest uppercase no-underline"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "1.8rem",
            background: "linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #dc2626 100%)",
            color: "#000",
            boxShadow: "0 6px 30px rgba(249,115,22,0.5), 0 2px 8px rgba(0,0,0,0.5)",
            letterSpacing: "0.1em",
          }}
        >
          SIGN UP NOW
        </Link>

        {/* Benefits Section */}
        <div className="w-full max-w-sm">
          <p
            className="text-center text-amber-400 font-black tracking-widest uppercase mb-4 text-sm"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            MEMBER BENEFITS
          </p>
          <div className="flex flex-col gap-3">
            {[
              { icon: "⭐", title: "Earn Points Every Visit", desc: "Rack up points with every purchase" },
              { icon: "🎂", title: "Birthday Rewards", desc: "Get a special treat on your birthday" },
              { icon: "🔥", title: "Exclusive Offers", desc: "Members-only deals and early access" },
              { icon: "📍", title: "Location Updates", desc: "Be first to know where we're parked" },
              { icon: "🎁", title: "Free Item Redemptions", desc: "Redeem points for food & drinks" },
            ].map((b) => (
              <div
                key={b.title}
                className="flex items-center gap-4 px-4 py-3 rounded-xl"
                style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.15)" }}
              >
                <span className="text-2xl">{b.icon}</span>
                <div>
                  <p className="text-amber-400 font-bold text-sm leading-tight"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.05em" }}>
                    {b.title}
                  </p>
                  <p className="text-white/50 text-xs">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/40 text-sm text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-amber-400 hover:underline font-semibold">
            Member Log In
          </Link>
        </p>
        <p className="text-white/25 text-xs text-center -mt-3">
          Employees & admins use the links at the top of the page.
        </p>
            <p className="text-white/35 text-xs text-center -mt-2">
  Powered by{" "}
  <span className="text-amber-400/80 font-semibold">
    JD Righteous LLC
  </span>
</p>

      </div>

      {/* Checkered bottom stripe */}
      <div className="mt-auto">
        <div
          className="h-4"
          style={{ backgroundImage: "repeating-linear-gradient(90deg, #f59e0b 0px, #f59e0b 20px, #1a0e00 20px, #1a0e00 40px)" }}
        />
        <div
          className="h-3 opacity-60"
          style={{ backgroundImage: "repeating-linear-gradient(90deg, #1a0e00 0px, #1a0e00 20px, #f59e0b 20px, #f59e0b 40px)" }}
        />
      </div>
    </div>
  );
}