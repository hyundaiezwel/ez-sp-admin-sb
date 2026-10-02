package com.hyundaiezwel.vs.common;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/**
 * DB 일시 문자열(varchar(14) yyyyMMddHHmmss, KST)과 Instant 사이 변환.
 * DB 기본값 to_char(now()) 는 DB 서버 타임존을 타므로(컨테이너는 UTC) 앱이 항상 KST 로 직접 넣는다.
 */
public final class Times {

    public static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter DTM = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private Times() {
    }

    public static String toDtm(Instant instant) {
        return DTM.format(instant.atZone(KST));
    }

    public static Instant parseDtm(String dtm) {
        return LocalDateTime.parse(dtm, DTM).atZone(KST).toInstant();
    }
}
