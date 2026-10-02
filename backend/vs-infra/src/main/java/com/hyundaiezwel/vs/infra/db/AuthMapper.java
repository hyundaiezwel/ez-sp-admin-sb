package com.hyundaiezwel.vs.infra.db;

import com.hyundaiezwel.vs.auth.Mngr;
import com.hyundaiezwel.vs.code.Code;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;

/**
 * 인증·공통코드 SQL. 조건 분기 없이 SQL 만 둔다(판정은 AuthService).
 * 상태 갱신은 읽은 값 조건부 UPDATE — vs_mngr_b 에 version 컬럼이 없어 읽은 컬럼값을 조건으로 쓴다.
 * 일시는 앱이 KST 로 넣는다(DB 기본값 now() 는 서버 타임존을 탄다).
 */
@Mapper
public interface AuthMapper {

    @Select("""
            select mngr_id, mngr_div_cd, auth_cd, mngr_nm, brdt, mbl_telno_enc, dept_nm, jbps_nm,
                   pwd_hash, prev_pwd_hash, tmp_pwd_yn, acnt_st_cd, lgin_fail_cnt, last_lgin_dtm
              from vs_mngr_b
             where mngr_id = #{mngrId}
            """)
    Mngr findMngr(String mngrId);

    @Update("""
            update vs_mngr_b
               set lgin_fail_cnt = #{newFailCnt}, acnt_st_cd = #{newStatus},
                   lock_dtm = case when #{newStatus} = 'LOCK' and acnt_st_cd <> 'LOCK' then #{dtm} else lock_dtm end,
                   last_mod_dtm = #{dtm}, last_mod_usr_id = #{usrId}, last_mod_pgm_id = 'AUTH'
             where mngr_id = #{mngrId} and lgin_fail_cnt = #{expectedFailCnt} and acnt_st_cd = #{expectedStatus}
            """)
    int updateFailCntAndStatus(String mngrId, int expectedFailCnt, String expectedStatus,
                               int newFailCnt, String newStatus, String usrId, String dtm);

    @Update("""
            update vs_mngr_b
               set lgin_fail_cnt = 0, last_lgin_dtm = #{dtm},
                   last_mod_dtm = #{dtm}, last_mod_usr_id = #{mngrId}, last_mod_pgm_id = 'AUTH'
             where mngr_id = #{mngrId} and acnt_st_cd = 'USE'
            """)
    int recordLoginSuccess(String mngrId, String dtm);

    @Update("""
            update vs_mngr_b
               set prev_pwd_hash = pwd_hash, pwd_hash = #{newHash}, tmp_pwd_yn = 'N', pwd_chg_dtm = #{dtm},
                   last_mod_dtm = #{dtm}, last_mod_usr_id = #{mngrId}, last_mod_pgm_id = 'AUTH'
             where mngr_id = #{mngrId} and pwd_hash = #{expectedHash}
            """)
    int changePassword(String mngrId, String expectedHash, String newHash, String dtm);

    @Insert("""
            insert into vs_hist_h (hist_typ_cd, tgt_tbl_nm, tgt_key, bef_val, aft_val, dtl_json, ip_addr,
                                   reg_dtm, reg_usr_id, reg_pgm_id)
            values (#{histTypCd}, 'vs_mngr_b', #{tgtKey,jdbcType=VARCHAR}, #{befVal,jdbcType=VARCHAR},
                    #{aftVal,jdbcType=VARCHAR}, cast(#{dtlJson,jdbcType=VARCHAR} as jsonb), #{ipAddr,jdbcType=VARCHAR},
                    #{regDtm}, #{regUsrId}, 'AUTH')
            """)
    int insertHist(String histTypCd, String tgtKey, String befVal, String aftVal, String dtlJson, String ipAddr,
                   String regDtm, String regUsrId);

    @Select("""
            <script>
            select cd_grp, cd, cd_nm, sort_ordg, up_cd, cd_add_val1, cd_add_val2
              from vs_cd_c
             where use_yn = 'Y'
               and cd_grp in <foreach collection="groups" item="g" open="(" separator="," close=")">#{g}</foreach>
             order by cd_grp, sort_ordg, cd
            </script>
            """)
    List<Code> findCodes(List<String> groups);
}
