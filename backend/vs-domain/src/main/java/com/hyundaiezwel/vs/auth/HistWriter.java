package com.hyundaiezwel.vs.auth;

/** vs_hist_h INSERT 전용(테이블 트리거가 UPDATE·DELETE 를 막는다). */
public interface HistWriter {
    void write(Hist hist);
}
