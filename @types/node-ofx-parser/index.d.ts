declare module 'node-ofx-parser' {
  export interface OFXTransaction {
    FITID: string;
    DTPOSTED: string;
    TRNAMT: string;
    NAME: string;
    MEMO?: string;
    BANKACCTFROM?: {
      BANKID?: string;
      ACCTID?: string;
      ACCTTYPE?: string;
    };
    TRNTYPE?: string;
  }

  export interface OFXData {
    OFX: {
      BANKMSGSRSV1?: {
        STMTTRNRS: {
          STMTRS: {
            BANKACCTFROM: {
              BANKID: string;
              ACCTID: string;
              ACCTTYPE: string;
            };
            BANKTRANLIST: {
              STMTTRN: OFXTransaction[];
            };
            CURDEF: string;
          };
        };
      };
      CREDITCARDMSGSRSV1?: {
        CCSTMTTRNRS: {
          CCSTMTRS: {
            CCACCTFROM: {
              ACCTID: string;
            };
            BANKTRANLIST: {
              STMTTRN: OFXTransaction[];
            };
            CURDEF: string;
          };
        };
      };
    };
  }

  export interface ParseResult {
    body: OFXData;
  }

  function parse(ofxData: string): Promise<ParseResult>;
  export default parse;
}