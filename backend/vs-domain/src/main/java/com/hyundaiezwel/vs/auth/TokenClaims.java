package com.hyundaiezwel.vs.auth;

import java.time.Instant;

/** JWT claim — sub=mngrId, div, auth, chnl, sid, exp=절대 만료(로그인 후 12시간). */
public record TokenClaims(String sub, String div, String auth, String chnl, String sid, Instant exp) {
}
