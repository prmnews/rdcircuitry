# PowerShell script to create SSM parameters

$params = @{
    "/rdcircuitry/nextauth/secret" = "#LGC4ad!$2u@u&Qp&z^tABYmOX!r5US8bK&MCpNA8D5alTRfHw6ek2NlsePJ*U5LeIsd5JVDBhUkBk6WQx!@laazm1YRWn1v"
    "/rdcircuitry/encryption/key" = "by9%Y@#*!Wf3Svb*3qb^KZvsk&zZBS1u%hvhU6RDz0tYts4Rj%&^E4*d0iJpb2WUdjXGYGr&Vm^9O6he1Wik%k%mGB3iI^6u"
    "/rdcircuitry/jwt/secret" = "x@KqLFzR6xYs$IqobyMaA^DSglh@%lQSCvZ3fcwQl@7OqzF7azPxx@LlHgVh1d&auLSW6DXwNXS5%GAoRgB^Q7kVcC@L%ht!"
    "/rdcircuitry/mongodb/uri" = "mongodb+srv://kmxiaaw7gxy3jedt:PNZhs5UbiV6S06LI@rdi-cluster.gmmeuph.mongodb.net/"
    "/rdcircuitry/twitter/api_key" = "Qy3CmazTlUv59peugMvEFlU4Q"
    "/rdcircuitry/twitter/api_secret" = "wZ3CpFpdZcOH8NppDqw0Hiu01V65oHSNLeZRTh67c4tEkUxSwt"
    "/rdcircuitry/twitter/access_token" = "882039189377695744-p7wbQB9EEyznU2ubJtcbVFg0pSYBq22"
    "/rdcircuitry/twitter/access_secret" = "q5lLX3bg3ztfcxKSSW0ZnJYCXpPbkdEcsArXnGAZv09Ld"
    "/rdcircuitry/twitter/bearer_token" = "AAAAAAAAAAAAAAAAAAAAAPLIqgEAAAAAfLEtLdheX9UDbSog24lgFssjQJ8%3DbB6TxA0sLbdNjpLPq0f24niW0zwa0IM5SEqtNfHM18e1cj5cmX"
    "/rdcircuitry/webhook/secret" = "akkpDG5mA*OfZ!rBPTcY*Z3cMsi&TxsNoCzozuFA3ljtFF!Gx#aspkeol1%5Ek6B2qNYPM$qcITdBJiJqWebWaJ##k*7DHmS"
}

foreach ($param in $params.GetEnumerator()) {
    Write-Host "Creating parameter: $($param.Key)"
    aws ssm put-parameter `
        --name $param.Key `
        --type "SecureString" `
        --value $param.Value `
        --region us-west-2 `
        --overwrite
} 