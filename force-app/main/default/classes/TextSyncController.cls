public without sharing class TextSyncController {

    // 🔹 GET TEXT + RECORD ID
    @AuraEnabled
    public static Map<String, Object> getText(String password) {

        Map<String, Object> result = new Map<String, Object>();

        if (String.isBlank(password)) {
            result.put('status', 'EMPTY');
            return result;
        }

        List<Shared_Text__c> records = [
            SELECT Id, Content__c, Content_2__c, Content_3__c
            FROM Shared_Text__c 
            WHERE Password__c = :password
            LIMIT 1
        ];

        if (records.isEmpty()) {

            result.put('status', 'NEW');

        } else {

            Shared_Text__c rec = records[0];

            // 🔗 Join all parts safely
            String fullContent = '';

            if (rec.Content__c != null) {
                fullContent += rec.Content__c;
            }
            if (rec.Content_2__c != null) {
                fullContent += rec.Content_2__c;
            }
            if (rec.Content_3__c != null) {
                fullContent += rec.Content_3__c;
            }

            result.put('status', 'EXISTING');
            result.put('content', fullContent);
            result.put('recordId', rec.Id); // 🔥 IMPORTANT for file upload
        }

        return result;
    }

    // 🔹 SAVE TEXT + RETURN RECORD ID
    @AuraEnabled
    public static Id saveText(String content, String password) {

        if (String.isBlank(password)) {
            throw new AuraHandledException('Password required');
        }

        // Prevent null issues
        if (content == null) {
            content = '';
        }

        Integer chunkSize = 30000;

        // 🔪 Split content safely into 3 parts
        String part1 = '';
        String part2 = '';
        String part3 = '';

        if (content.length() > 0) {
            part1 = content.substring(0, Math.min(chunkSize, content.length()));
        }

        if (content.length() > chunkSize) {
            part2 = content.substring(
                chunkSize,
                Math.min(chunkSize * 2, content.length())
            );
        }

        if (content.length() > chunkSize * 2) {
            part3 = content.substring(
                chunkSize * 2,
                Math.min(chunkSize * 3, content.length())
            );
        }

        Shared_Text__c record;

        List<Shared_Text__c> existing = [
            SELECT Id 
            FROM Shared_Text__c 
            WHERE Password__c = :password
            LIMIT 1
        ];

        if (!existing.isEmpty()) {
            record = existing[0];
        } else {
            record = new Shared_Text__c(
                Name = 'Guest Record',
                Password__c = password
            );
        }

        // ✅ Assign all parts
        record.Content__c   = part1;
        record.Content_2__c = part2;
        record.Content_3__c = part3;

        if (record.Id != null) {
            update record;
        } else {
            insert record;
        }

        return record.Id; // 🔥 REQUIRED for file upload
    }
    @AuraEnabled
public static List<Map<String, String>> getFiles(Id recordId) {

    List<Map<String, String>> fileList = new List<Map<String, String>>();

    if (recordId == null) return fileList;

    List<ContentDocumentLink> links = [
        SELECT ContentDocumentId,
               ContentDocument.Title
        FROM ContentDocumentLink
        WHERE LinkedEntityId = :recordId
    ];

    for (ContentDocumentLink link : links) {

        Map<String, String> fileMap = new Map<String, String>();
        fileMap.put('name', link.ContentDocument.Title);
        fileMap.put('documentId', link.ContentDocumentId);

        fileList.add(fileMap);
    }

    return fileList;
}
@AuraEnabled
public static Id createRecord(String password) {

    if (String.isBlank(password)) {
        throw new AuraHandledException('Password required');
    }

    // check if already exists
    List<Shared_Text__c> existing = [
        SELECT Id FROM Shared_Text__c 
        WHERE Password__c = :password 
        LIMIT 1
    ];

    if (!existing.isEmpty()) {
        return existing[0].Id;
    }

    Shared_Text__c rec = new Shared_Text__c(
        Name = 'Guest Record',
        Password__c = password
    );

    insert rec;

    return rec.Id;
}
}